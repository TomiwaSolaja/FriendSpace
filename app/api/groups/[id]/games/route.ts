import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { applyThisOrThatVote, applyTicTacToeMove, newThisOrThat, newTicTacToe, type ThisOrThatState, type TicTacToeState } from "@/lib/games";

type Context = { params: Promise<{ id: string }> };

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function POST(request: Request, context: Context) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const { id } = await context.params;
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
    include: { group: { include: { members: true } } },
  });
  if (!membership) return jsonError("Group not found", 404);
  if (membership.group.status === "ARCHIVED") return jsonError("This group is closed");

  const body = await request.json().catch(() => null);
  const memberIds = membership.group.members.map((member) => member.userId);

  try {
    if (body?.action === "create" && body.type === "TICTACTOE") {
      const opponentId = String(body.opponentId ?? "");
      if (!memberIds.includes(opponentId) || opponentId === user.id) return jsonError("Pick someone in the group");
      const game = await prisma.gameSession.create({
        data: { groupId: id, type: "TICTACTOE", state: asJson(newTicTacToe(user.id, opponentId)) },
      });
      return NextResponse.json({ id: game.id });
    }

    if (body?.action === "create" && body.type === "THIS_OR_THAT") {
      const game = await prisma.gameSession.create({
        data: { groupId: id, type: "THIS_OR_THAT", state: asJson(newThisOrThat()) },
      });
      return NextResponse.json({ id: game.id });
    }

    if (body?.action === "move") {
      const game = await prisma.gameSession.findFirst({ where: { id: String(body.gameId ?? ""), groupId: id, type: "TICTACTOE" } });
      if (!game) return jsonError("Game not found", 404);
      const state = applyTicTacToeMove(game.state as TicTacToeState, user.id, Number(body.cell));
      await prisma.gameSession.update({ where: { id: game.id }, data: { state: asJson(state) } });
      return NextResponse.json({ ok: true });
    }

    if (body?.action === "vote") {
      const game = await prisma.gameSession.findFirst({ where: { id: String(body.gameId ?? ""), groupId: id, type: "THIS_OR_THAT" } });
      if (!game) return jsonError("Game not found", 404);
      const choice = body.choice === "b" ? "b" : body.choice === "a" ? "a" : null;
      if (!choice) return jsonError("Pick one of the two options");
      const state = applyThisOrThatVote(game.state as ThisOrThatState, user.id, choice, memberIds);
      await prisma.gameSession.update({ where: { id: game.id }, data: { state: asJson(state) } });
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not update the game");
  }

  return jsonError("Unknown game action");
}
