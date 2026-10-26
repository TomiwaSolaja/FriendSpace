import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { submitDecision } from "@/lib/groups";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== "STAY" && decision !== "LEAVE" && decision !== "ONE_ON_ONE") {
    return jsonError("Choose stay, leave, or one-on-one");
  }
  const dmUserIds = Array.isArray(body?.dmUserIds) ? body.dmUserIds.filter((item: unknown) => typeof item === "string") : [];
  try {
    await submitDecision(user.id, id, decision, dmUserIds);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save that choice";
    const status = message === "This group is not taking decisions right now" ? 404 : 400;
    return jsonError(message, status);
  }
  return NextResponse.json({ ok: true });
}
