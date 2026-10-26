import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { serializeMessage } from "@/lib/serialize";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const { id } = await context.params;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (!membership) return jsonError("Group not found", 404);

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { sender: { select: { name: true } } },
      },
      games: { orderBy: { updatedAt: "desc" }, take: 8 },
    },
  });
  if (!group) return jsonError("Group not found", 404);

  return NextResponse.json({
    id: group.id,
    status: group.status,
    endsAt: group.endsAt.toISOString(),
    decidingSince: group.decidingSince?.toISOString() ?? null,
    myDecision: membership.decision,
    members: group.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      decided: member.decision != null,
      mine: member.user.id === user.id,
    })),
    messages: group.messages.reverse().map((message) => serializeMessage(message, user.id)),
    games: group.games.map((game) => ({
      id: game.id,
      type: game.type,
      state: game.state,
      updatedAt: game.updatedAt.toISOString(),
    })),
  });
}
