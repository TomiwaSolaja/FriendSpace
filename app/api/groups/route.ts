import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return error;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, group: { status: { not: "ARCHIVED" } } },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { group: { createdAt: "desc" } },
  });

  return NextResponse.json({
    groups: memberships.map((membership) => ({
      id: membership.group.id,
      status: membership.group.status,
      endsAt: membership.group.endsAt.toISOString(),
      members: membership.group.members.map((member) => member.user.name),
    })),
  });
}
