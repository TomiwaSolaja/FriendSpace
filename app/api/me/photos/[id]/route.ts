import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { deleteStoredPhoto } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const { id } = await context.params;
  const photo = await prisma.photo.findFirst({ where: { id, userId: user.id } });
  if (!photo) return jsonError("Photo not found", 404);
  await deleteStoredPhoto(photo.blobName);
  await prisma.photo.delete({ where: { id: photo.id } });
  return NextResponse.json({ ok: true });
}
