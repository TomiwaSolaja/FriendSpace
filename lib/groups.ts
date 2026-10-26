import type { MemberDecision, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { planGroups } from "@/lib/matching";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DECISION_WINDOW_MS = 48 * 60 * 60 * 1000;

type Tx = Prisma.TransactionClient;

export async function formWeeklyGroups() {
  const busy = await prisma.groupMember.findMany({
    where: { group: { status: { in: ["ACTIVE", "DECIDING"] } } },
    select: { userId: true },
  });
  const busyIds = new Set(busy.map((member) => member.userId));

  const users = await prisma.user.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    include: { interests: true },
  });
  const eligible = users.filter(
    (user) => !busyIds.has(user.id) && user.latitude != null && user.longitude != null,
  );
  const ids = eligible.map((user) => user.id);
  if (ids.length < 3) return [];

  const likes = await prisma.swipe.findMany({
    where: { liked: true, fromUserId: { in: ids }, toUserId: { in: ids } },
    select: { fromUserId: true, toUserId: true },
  });

  const planned = planGroups(
    eligible.map((user) => ({
      id: user.id,
      latitude: user.latitude!,
      longitude: user.longitude!,
      maxDistanceMi: user.maxDistanceMi,
      gender: user.gender,
      interestedIn: user.interestedIn,
      interestIds: user.interests.map((item) => item.interestId),
    })),
    likes.map((like) => ({ fromId: like.fromUserId, toId: like.toUserId })),
  );

  const now = new Date();
  for (const memberIds of planned) {
    await prisma.group.create({
      data: {
        startsAt: now,
        endsAt: new Date(now.getTime() + WEEK_MS),
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
    });
  }
  return planned;
}

export async function transitionExpiredGroups() {
  const result = await prisma.group.updateMany({
    where: { status: "ACTIVE", endsAt: { lte: new Date() } },
    data: { status: "DECIDING", decidingSince: new Date() },
  });
  return result.count;
}

export async function applyReadyDecisions() {
  const groups = await prisma.group.findMany({
    where: { status: "DECIDING" },
    include: { members: true },
  });
  let resolved = 0;
  for (const group of groups) {
    const allDecided = group.members.every((member) => member.decision);
    const windowPassed =
      group.decidingSince != null && Date.now() - group.decidingSince.getTime() >= DECISION_WINDOW_MS;
    if (allDecided || windowPassed) {
      await resolveGroup(group.id);
      resolved += 1;
    }
  }
  return resolved;
}

export async function submitDecision(
  userId: string,
  groupId: string,
  decision: MemberDecision,
  dmUserIds: string[],
) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: { include: { members: true } } },
  });
  if (!membership || membership.group.status !== "DECIDING") {
    throw new Error("This group is not taking decisions right now");
  }

  const others = membership.group.members.map((member) => member.userId).filter((id) => id !== userId);
  const picked =
    decision === "ONE_ON_ONE" ? [...new Set(dmUserIds)].filter((id) => others.includes(id)) : [];
  if (decision === "ONE_ON_ONE" && picked.length === 0) {
    throw new Error("Pick at least one person to keep talking with");
  }

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { decision, decidedAt: new Date(), dmUserIds: picked },
  });

  const updated = await prisma.groupMember.findMany({ where: { groupId } });
  if (updated.every((member) => member.decision)) await resolveGroup(groupId);
}

export async function resolveGroup(groupId: string) {
  await prisma.$transaction(async (tx) => {
    const group = await tx.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group || group.status !== "DECIDING") return;

    for (const member of group.members) {
      if (member.decision !== "ONE_ON_ONE") continue;
      for (const otherId of member.dmUserIds) {
        if (!group.members.some((item) => item.userId === otherId)) continue;
        await findOrCreateDm(tx, member.userId, otherId);
      }
    }

    const stayers = group.members.filter((member) => member.decision === "STAY");
    if (stayers.length >= 3) {
      const stayIds = stayers.map((member) => member.userId);
      await tx.groupMember.deleteMany({ where: { groupId, userId: { notIn: stayIds } } });
      await tx.groupMember.updateMany({
        where: { groupId, userId: { in: stayIds } },
        data: { decision: null, decidedAt: null, dmUserIds: [] },
      });
      const now = new Date();
      await tx.group.update({
        where: { id: groupId },
        data: {
          status: "ACTIVE",
          startsAt: now,
          endsAt: new Date(now.getTime() + WEEK_MS),
          decidingSince: null,
        },
      });
      return;
    }

    await tx.group.update({ where: { id: groupId }, data: { status: "ARCHIVED" } });
  });
}

async function findOrCreateDm(tx: Tx, a: string, b: string) {
  const memberships = await tx.conversationMember.findMany({
    where: { userId: a },
    include: { conversation: { include: { members: true } } },
  });
  const existing = memberships.find((membership) => {
    const ids = membership.conversation.members.map((member) => member.userId);
    return ids.length === 2 && ids.includes(b);
  });
  if (existing) return existing.conversationId;

  const created = await tx.conversation.create({
    data: { members: { create: [{ userId: a }, { userId: b }] } },
  });
  return created.id;
}
