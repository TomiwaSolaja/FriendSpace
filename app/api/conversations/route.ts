import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return error;

  const memberships = await prisma.conversationMember.findMany({
    where: { userId: user.id },
    include: {
      conversation: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { createdAt: "desc" } },
  });

  return NextResponse.json({
    conversations: memberships.map((membership) => {
      const other = membership.conversation.members.find((member) => member.userId !== user.id);
      const last = membership.conversation.messages[0];
      return {
        id: membership.conversation.id,
        otherName: other?.user.name ?? "Someone",
        lastMessage: last?.body ?? "",
        updatedAt: (last?.createdAt ?? membership.conversation.createdAt).toISOString(),
      };
    }),
  });
}
