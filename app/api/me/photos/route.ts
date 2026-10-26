import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { savePhoto } from "@/lib/storage";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (!user) return error;
  if (user.photos.length >= MAX_PHOTOS) return jsonError("You can add up to 6 photos");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("Choose a photo");
  const ext = TYPES[file.type];
  if (!ext) return jsonError("Use a JPEG, PNG, or WebP photo");
  if (file.size > MAX_BYTES) return jsonError("Photos need to be 5 MB or smaller");

  const bytes = Buffer.from(await file.arrayBuffer());
  const blobName = await savePhoto(user.id, bytes, ext);
  const photo = await prisma.photo.create({
    data: { userId: user.id, blobName, sortOrder: user.photos.length },
  });
  return NextResponse.json({ id: photo.id });
}
