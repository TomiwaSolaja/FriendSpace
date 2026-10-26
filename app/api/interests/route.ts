import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return error;
  const interests = await prisma.interest.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ interests });
}
