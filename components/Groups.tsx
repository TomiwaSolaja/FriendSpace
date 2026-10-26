"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

type GroupSummary = {
  id: string;
  status: "ACTIVE" | "DECIDING" | "ARCHIVED";
  endsAt: string;
  members: string[];
};

export function GroupList() {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ groups: GroupSummary[] }>("/api/groups")
      .then((data) => setGroups(data.groups))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load groups"));
  }, []);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl">Your groups</h1>
      <p className="mt-2 text-sm text-ink/70">
        New groups are formed once a week from people who liked each other or share interests. A group lasts seven days.
      </p>
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}
      {groups === null && !error ? <p className="mt-6 text-ink/70">Loading groups…</p> : null}
      {groups && groups.length === 0 ? (
        <p className="mt-6 rounded-3xl bg-paper p-6 shadow-sm">You are not in a group this week. Keep swiping, and check back after the weekly grouping.</p>
      ) : null}
      <ul className="mt-6 space-y-3">
        {groups?.map((group) => (
          <li key={group.id}>
            <Link href={`/app/groups/${group.id}`} className="block rounded-3xl bg-paper p-5 shadow-sm">
              <p className="font-medium">{group.members.join(", ")}</p>
              <p className="mt-1 text-sm text-ink/70">
                {group.status === "DECIDING" ? "Time to choose whether to stay" : `Together until ${new Date(group.endsAt).toLocaleDateString()}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GroupRoom({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<GroupPayload | null>(null);
  const [activities, setActivities] = useState<{ title: string; detail: string }[]>([]);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [dmIds, setDmIds] = useState<string[]>([]);
  const [showDm, setShowDm] = useState(false);

  async function refresh() {
    const data = await api<GroupPayload>(`/api/groups/${groupId}`);
    setGroup(data);
    setOpponentId((current) => current || data.members.find((member) => !member.mine)?.id || "");
  }

  useEffect(() => {
    let stop = false;
    const load = () => {
      refresh().catch((err: unknown) => {
        if (!stop) setError(err instanceof Error ? err.message : "Could not load the group");
      });
    };
    load();
    const timer = setInterval(load, 3000);
    api<{ activities: { title: string; detail: string }[] }>(`/api/groups/${groupId}/activities`)
      .then((data) => {
        if (!stop) setActivities(data.activities);
      })
      .catch(() => {
        if (!stop) {
          setActivities([
            { title: "Get coffee", detail: "Pick a cafe between everyone" },
            { title: "Walk in a park", detail: "An easy way to meet up" },
            { title: "Try a local restaurant", detail: "Somewhere new for the group" },
          ]);
        }
      });
    return () => {
      stop = true;
      clearInterval(timer);
    };
    // refresh closes over opponentId only to set the default once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await api(`/api/groups/${groupId}/messages`, { method: "POST", body: JSON.stringify({ body: text }) });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that message");
    }
  }

  async function decide(decision: "STAY" | "LEAVE" | "ONE_ON_ONE") {
    setError("");
    try {
      await api(`/api/groups/${groupId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, dmUserIds: dmIds }),
      });
      setShowDm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that choice");
    }
  }

  async function game(body: Record<string, unknown>) {
    setError("");
    try {
      await api(`/api/groups/${groupId}/games`, { method: "POST", body: JSON.stringify(body) });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the game");
    }
  }

  if (!group) return <p className="text-ink/70">{error || "Loading group…"}</p>;
  const closed = group.status === "ARCHIVED";
  const names = new Map(group.members.map((member) => [member.id, member.name]));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section>
        <Link href="/app/groups" className="text-sm text-leaf">
          All groups
        </Link>
        <h1 className="mt-2 font-serif text-3xl">{group.members.map((member) => member.name).join(", ")}</h1>
        {group.status === "ACTIVE" ? (
          <p className="mt-1 text-sm text-ink/70">Together until {new Date(group.endsAt).toLocaleDateString()}.</p>
        ) : null}
        {group.status === "DECIDING" ? (
          <div className="mt-4 rounded-3xl bg-paper p-4 shadow-sm">
            <p className="text-sm">The week is over. Stay if at least three of you want to, leave, or keep talking with specific people.</p>
            {group.myDecision ? (
              <p className="mt-2 text-sm text-leaf">Your choice is saved. The group updates when everyone has chosen, or after 48 hours.</p>
            ) : showDm ? (
              <div className="mt-3 space-y-2">
                {group.members
                  .filter((member) => !member.mine)
                  .map((member) => (
                    <label key={member.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={dmIds.includes(member.id)}
                        onChange={(event) =>
                          setDmIds((current) =>
                            event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id),
                          )
                        }
                      />
                      {member.name}
                    </label>
                  ))}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => void decide("ONE_ON_ONE")} className="rounded-full bg-leaf px-4 py-2 text-sm text-white">
                    Start those chats
                  </button>
                  <button type="button" onClick={() => setShowDm(false)} className="rounded-full bg-sand px-4 py-2 text-sm">
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void decide("STAY")} className="rounded-full bg-leaf px-4 py-2 text-sm text-white">
                  Stay
                </button>
                <button type="button" onClick={() => void decide("LEAVE")} className="rounded-full bg-sand px-4 py-2 text-sm">
                  Leave
                </button>
                <button type="button" onClick={() => setShowDm(true)} className="rounded-full bg-sand px-4 py-2 text-sm">
                  Talk one to one
                </button>
              </div>
            )}
            <p className="mt-3 text-xs text-ink/60">
              {group.members.filter((member) => member.decided).length} of {group.members.length} have chosen.
            </p>
          </div>
        ) : null}
        {closed ? (
          <p className="mt-4 rounded-3xl bg-paper p-4 text-sm shadow-sm">
            This group has closed. One-to-one chats are in <Link href="/app/messages" className="text-leaf">Messages</Link>.
          </p>
        ) : null}

        <div className="mt-4 flex h-[28rem] flex-col rounded-3xl bg-paper shadow-sm">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {group.messages.length === 0 ? <p className="text-sm text-ink/60">Say hello, or start a game.</p> : null}
            {group.messages.map((message) => (
              <div key={message.id} className={message.mine ? "text-right" : "text-left"}>
                {!message.mine ? <p className="mb-1 text-xs text-ink/50">{message.senderName}</p> : null}
                <p className={message.mine ? "inline-block max-w-[80%] rounded-2xl bg-leaf px-3 py-2 text-left text-sm text-white" : "inline-block max-w-[80%] rounded-2xl bg-sand px-3 py-2 text-sm"}>
                  {message.body}
                </p>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-sand p-3">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={closed}
              placeholder={closed ? "This group is closed" : "Message the group"}
              className="flex-1 rounded-full border border-sand bg-cream px-4 py-2 text-sm"
            />
            <button type="submit" disabled={closed} className="rounded-full bg-leaf px-4 py-2 text-sm text-white disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
        {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl bg-paper p-4 shadow-sm">
          <h2 className="font-serif text-xl">Nearby ideas</h2>
          <ul className="mt-3 space-y-3">
            {activities.map((activity) => (
              <li key={activity.title}>
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-xs capitalize text-ink/60">{activity.detail}</p>
              </li>
            ))}
            {activities.length === 0 ? <li className="text-sm text-ink/60">Looking up places…</li> : null}
          </ul>
        </div>

        <div className="rounded-3xl bg-paper p-4 shadow-sm">
          <h2 className="font-serif text-xl">Games</h2>
          <label className="mt-3 block text-xs text-ink/70">
            Tic-tac-toe opponent
            <select value={opponentId} onChange={(event) => setOpponentId(event.target.value)} className="mt-1 w-full rounded-xl border border-sand bg-cream px-2 py-1.5 text-sm">
              {group.members
                .filter((member) => !member.mine)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={closed} onClick={() => void game({ action: "create", type: "TICTACTOE", opponentId })} className="rounded-full bg-sand px-3 py-1.5 text-xs disabled:opacity-50">
              Start tic-tac-toe
            </button>
            <button type="button" disabled={closed} onClick={() => void game({ action: "create", type: "THIS_OR_THAT" })} className="rounded-full bg-sand px-3 py-1.5 text-xs disabled:opacity-50">
              Start this or that
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {group.games.map((item) =>
              item.type === "TICTACTOE" ? (
                <TicTacToe key={item.id} state={item.state as TicState} names={names} disabled={closed} onMove={(cell) => void game({ action: "move", gameId: item.id, cell })} />
              ) : (
                <ThisOrThat
                  key={item.id}
                  state={item.state as TotState}
                  names={names}
                  myId={group.members.find((member) => member.mine)?.id ?? ""}
                  disabled={closed}
                  onVote={(choice) => void game({ action: "vote", gameId: item.id, choice })}
                />
              ),
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

type Member = { id: string; name: string; decided: boolean; mine: boolean };
type GroupPayload = {
  id: string;
  status: "ACTIVE" | "DECIDING" | "ARCHIVED";
  endsAt: string;
  myDecision: string | null;
  members: Member[];
  messages: { id: string; body: string; senderName: string; mine: boolean }[];
  games: { id: string; type: string; state: unknown }[];
};
type TicState = {
  board: Array<"X" | "O" | null>;
  playerX: string;
  playerO: string;
  turn: "X" | "O";
  winner: "X" | "O" | "draw" | null;
};
type TotState = {
  prompt: { a: string; b: string };
  votes: Record<string, "a" | "b">;
  revealed: boolean;
};

function TicTacToe({
  state,
  names,
  disabled,
  onMove,
}: {
  state: TicState;
  names: Map<string, string>;
  disabled: boolean;
  onMove: (cell: number) => void;
}) {
  const label = state.winner === "draw" ? "Draw" : state.winner ? `${names.get(state.winner === "X" ? state.playerX : state.playerO) ?? "Someone"} won` : `${names.get(state.turn === "X" ? state.playerX : state.playerO) ?? "Someone"} to play`;
  return (
    <div>
      <p className="text-xs text-ink/60">
        {names.get(state.playerX)} vs {names.get(state.playerO)} · {label}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {state.board.map((mark, index) => (
          <button
            key={index}
            type="button"
            disabled={disabled || Boolean(mark) || Boolean(state.winner)}
            onClick={() => onMove(index)}
            className="h-10 rounded-lg bg-sand text-sm disabled:opacity-80"
          >
            {mark ?? ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThisOrThat({
  state,
  names,
  myId,
  disabled,
  onVote,
}: {
  state: TotState;
  names: Map<string, string>;
  myId: string;
  disabled: boolean;
  onVote: (choice: "a" | "b") => void;
}) {
  const votes = Object.values(state.votes);
  const aCount = votes.filter((vote) => vote === "a").length;
  const bCount = votes.filter((vote) => vote === "b").length;
  const voted = Boolean(state.votes[myId]);
  return (
    <div>
      <p className="text-xs text-ink/60">This or that</p>
      {state.revealed ? (
        <p className="mt-1 text-sm">
          {state.prompt.a}: {aCount} · {state.prompt.b}: {bCount}
        </p>
      ) : voted ? (
        <p className="mt-1 text-sm">Waiting for the rest of the group.</p>
      ) : (
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={disabled} onClick={() => onVote("a")} className="rounded-full bg-sand px-3 py-1.5 text-xs">
            {state.prompt.a}
          </button>
          <button type="button" disabled={disabled} onClick={() => onVote("b")} className="rounded-full bg-sand px-3 py-1.5 text-xs">
            {state.prompt.b}
          </button>
        </div>
      )}
      {!state.revealed ? (
        <p className="mt-1 text-xs text-ink/50">{Object.keys(state.votes).map((id) => names.get(id)).filter(Boolean).join(", ") || "No votes yet"}</p>
      ) : null}
    </div>
  );
}
