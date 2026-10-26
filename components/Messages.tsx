"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

type Conversation = { id: string; otherName: string; lastMessage: string; updatedAt: string };

export function MessageList() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ conversations: Conversation[] }>("/api/conversations")
      .then((data) => setConversations(data.conversations))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load messages"));
  }, []);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl">Messages</h1>
      <p className="mt-2 text-sm text-ink/70">One-to-one chats open when you choose them at the end of a group week.</p>
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}
      {conversations === null && !error ? <p className="mt-6 text-ink/70">Loading messages…</p> : null}
      {conversations && conversations.length === 0 ? <p className="mt-6 rounded-3xl bg-paper p-6 shadow-sm">No one-to-one chats yet.</p> : null}
      <ul className="mt-6 space-y-3">
        {conversations?.map((conversation) => (
          <li key={conversation.id}>
            <Link href={`/app/messages/${conversation.id}`} className="block rounded-3xl bg-paper p-5 shadow-sm">
              <p className="font-medium">{conversation.otherName}</p>
              <p className="mt-1 truncate text-sm text-ink/70">{conversation.lastMessage || "No messages yet"}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DirectChat({ conversationId }: { conversationId: string }) {
  const [chat, setChat] = useState<{ otherName: string; messages: { id: string; body: string; mine: boolean; senderName: string }[] } | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const data = await api<{ otherName: string; messages: { id: string; body: string; mine: boolean; senderName: string }[] }>(
      `/api/conversations/${conversationId}`,
    );
    setChat(data);
  }

  useEffect(() => {
    let stop = false;
    const load = () => {
      refresh().catch((err: unknown) => {
        if (!stop) setError(err instanceof Error ? err.message : "Could not load the chat");
      });
    };
    load();
    const timer = setInterval(load, 3000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await api(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that message");
    }
  }

  if (!chat) return <p className="text-ink/70">{error || "Loading chat…"}</p>;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/app/messages" className="text-sm text-leaf">
        All messages
      </Link>
      <h1 className="mt-2 font-serif text-3xl">{chat.otherName}</h1>
      <div className="mt-4 flex h-[32rem] flex-col rounded-3xl bg-paper shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {chat.messages.length === 0 ? <p className="text-sm text-ink/60">Start the conversation.</p> : null}
          {chat.messages.map((message) => (
            <div key={message.id} className={message.mine ? "text-right" : "text-left"}>
              <p className={message.mine ? "inline-block max-w-[80%] rounded-2xl bg-leaf px-3 py-2 text-left text-sm text-white" : "inline-block max-w-[80%] rounded-2xl bg-sand px-3 py-2 text-sm"}>
                {message.body}
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-sand p-3">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message" className="flex-1 rounded-full border border-sand bg-cream px-4 py-2 text-sm" />
          <button type="submit" className="rounded-full bg-leaf px-4 py-2 text-sm text-white">
            Send
          </button>
        </form>
      </div>
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
    </div>
  );
}
