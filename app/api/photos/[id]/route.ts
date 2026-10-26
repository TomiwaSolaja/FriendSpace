import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { readPhoto } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const { id } = await context.params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return jsonError("Photo not found", 404);
  const file = await readPhoto(photo.blobName);
  if (!file) return jsonError("Photo not found", 404);
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
