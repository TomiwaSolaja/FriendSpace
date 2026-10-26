import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";

export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const body = await request.json().catch(() => null);
  const toUserId = String(body?.toUserId ?? "");
  const liked = body?.liked;
  if (typeof liked !== "boolean" || !toUserId) return jsonError("Choose yes or no");
  if (toUserId === user.id) return jsonError("You cannot swipe on yourself");

  const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
  if (!target) return jsonError("That person is not available", 404);

  try {
    await prisma.swipe.create({ data: { fromUserId: user.id, toUserId, liked } });
  } catch {
    return jsonError("You already answered this person", 409);
  }

  let mutual = false;
  if (liked) {
    const back = await prisma.swipe.findUnique({
      where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: user.id } },
    });
    mutual = Boolean(back?.liked);
  }
  return NextResponse.json({ ok: true, mutual });
}
