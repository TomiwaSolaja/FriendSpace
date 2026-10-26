import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) return jsonError("Enter your email and password");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await compare(password, user.passwordHash))) {
    return jsonError("Email or password is incorrect", 401);
  }

  const response = NextResponse.json({ id: user.id });
  response.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions());
  return response;
}
