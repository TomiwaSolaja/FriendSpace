import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";

export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const body = await request.json().catch(() => null);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return jsonError("Latitude is invalid");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return jsonError("Longitude is invalid");

  await prisma.user.update({ where: { id: user.id }, data: { latitude, longitude } });
  return NextResponse.json({ ok: true });
}
