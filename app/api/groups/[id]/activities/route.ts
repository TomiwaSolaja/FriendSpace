import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { fallbackActivities, suggestActivities } from "@/lib/activities";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const { id } = await context.params;
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (!membership) return jsonError("Group not found", 404);

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    include: { user: { select: { latitude: true, longitude: true } } },
  });
  const located = members.filter((member) => member.user.latitude != null && member.user.longitude != null);
  if (located.length === 0) return NextResponse.json({ activities: fallbackActivities });

  const latitude = located.reduce((sum, member) => sum + member.user.latitude!, 0) / located.length;
  const longitude = located.reduce((sum, member) => sum + member.user.longitude!, 0) / located.length;
  const activities = await suggestActivities(latitude, longitude);
  return NextResponse.json({ activities });
}
