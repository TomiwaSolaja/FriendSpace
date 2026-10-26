import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { serializeMessage } from "@/lib/serialize";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const { id } = await context.params;
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
    include: { group: true },
  });
  if (!membership) return jsonError("Group not found", 404);
  if (membership.group.status === "ARCHIVED") return jsonError("This group is closed");

  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text) return jsonError("Write a message");
  if (text.length > 1000) return jsonError("Messages need to be 1000 characters or less");

  const message = await prisma.message.create({
    data: { body: text, senderId: user.id, groupId: id },
    include: { sender: { select: { name: true } } },
  });
  return NextResponse.json(serializeMessage(message, user.id));
}
