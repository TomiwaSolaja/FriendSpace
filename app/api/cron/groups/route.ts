import { NextResponse } from "next/server";
import { applyReadyDecisions, formWeeklyGroups, transitionExpiredGroups } from "@/lib/groups";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const transitioned = await transitionExpiredGroups();
  const resolved = await applyReadyDecisions();
  const matchToday = force || new Date().getUTCDay() === 1;
  const groups = matchToday ? await formWeeklyGroups() : [];

  return NextResponse.json({
    transitioned,
    resolved,
    matched: matchToday,
    formed: groups.length,
    sizes: groups.map((group) => group.length),
  });
}
