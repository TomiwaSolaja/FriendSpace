import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { isAtLeast18, parseDateOnly } from "@/lib/people";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const gender = body?.gender;
  const birthDate = parseDateOnly(String(body?.birthDate ?? ""));

  if (name.length < 1 || name.length > 40) return jsonError("Name must be 1–40 characters");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Enter a valid email");
  if (password.length < 8) return jsonError("Password must be at least 8 characters");
  if (gender !== "MAN" && gender !== "WOMAN") return jsonError("Choose man or woman");
  if (!birthDate || !isAtLeast18(birthDate)) return jsonError("You need to be 18 or older");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("An account with that email already exists", 409);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hash(password, 10),
      gender,
      birthDate,
    },
  });

  const response = NextResponse.json({ id: user.id });
  response.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions());
  return response;
}
