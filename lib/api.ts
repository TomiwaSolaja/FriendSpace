import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: jsonError("Sign in first", 401) };
  return { user, error: null };
}
