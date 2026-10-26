import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { serializeMessage } from "@/lib/serialize";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const { id } = await context.params;
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });
  if (!membership) return jsonError("Conversation not found", 404);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { sender: { select: { name: true } } },
      },
    },
  });
  if (!conversation) return jsonError("Conversation not found", 404);
  const other = conversation.members.find((member) => member.userId !== user.id);

  return NextResponse.json({
    id: conversation.id,
    otherName: other?.user.name ?? "Someone",
    messages: conversation.messages.reverse().map((message) => serializeMessage(message, user.id)),
  });
}
