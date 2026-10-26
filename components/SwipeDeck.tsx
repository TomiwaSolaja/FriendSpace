"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { api } from "@/lib/client";

type Card = {
  id: string;
  name: string;
  age: number;
  bio: string;
  distanceLabel: string;
  interests: string[];
  photoIds: string[];
};

export function SwipeDeck() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dx, setDx] = useState(0);
  const dxRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [origin, setOrigin] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ needsLocation: boolean; cards: Card[] }>("/api/deck");
    setNeedsLocation(data.needsLocation);
    setCards(data.cards);
    setPhotoIndex(0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ needsLocation: boolean; cards: Card[] }>("/api/deck").then(
      (data) => {
        if (cancelled) return;
        setNeedsLocation(data.needsLocation);
        setCards(data.cards);
        setPhotoIndex(0);
      },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load people");
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = useCallback(
    async (liked: boolean) => {
      const card = cards?.[0];
      if (!card || busy) return;
      setBusy(true);
      setError("");
      try {
        const result = await api<{ mutual: boolean }>("/api/swipes", {
          method: "POST",
          body: JSON.stringify({ toUserId: card.id, liked }),
        });
        if (result.mutual) setNotice(`${card.name} likes you too. You may end up in a group together.`);
        setCards((current) => current?.slice(1) ?? []);
        setPhotoIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save that swipe");
      } finally {
        dxRef.current = 0;
        setDx(0);
        setBusy(false);
      }
    },
    [busy, cards],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") void choose(true);
      if (event.key === "ArrowLeft") void choose(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose]);

  async function shareLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("This browser does not share location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api("/api/me/location", {
            method: "POST",
            body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
          });
          await load();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save your location");
        }
      },
      () => setError("Location permission is needed to find people nearby."),
    );
  }

  const card = cards?.[0];

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-3xl">People nearby</h1>
      <p className="mt-1 text-sm text-ink/70">Swipe right for yes, left for no. Closest people come first.</p>
      {notice ? (
        <p className="mt-4 rounded-2xl bg-leaf/10 px-4 py-3 text-sm text-leaf-dark">
          {notice}{" "}
          <button type="button" className="underline" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}

      {cards === null ? <p className="mt-8 text-ink/70">Loading people…</p> : null}
      {needsLocation ? (
        <div className="mt-8 rounded-3xl bg-paper p-6 shadow-sm">
          <p>Share your location so FriendSpace can show people within your distance.</p>
          <button type="button" onClick={() => void shareLocation()} className="mt-4 rounded-full bg-leaf px-4 py-2 text-sm text-white">
            Use my location
          </button>
        </div>
      ) : null}
      {cards && !needsLocation && !card ? (
        <div className="mt-8 rounded-3xl bg-paper p-6 shadow-sm">
          <p>No one new within your distance.</p>
          <Link href="/app/settings" className="mt-4 inline-block text-sm text-leaf">
            Widen your distance
          </Link>
        </div>
      ) : null}

      {card ? (
        <article
          className="mt-6 overflow-hidden rounded-3xl bg-paper shadow-sm"
          style={{ transform: `translateX(${dx}px) rotate(${dx / 18}deg)`, transition: dragging ? "none" : "transform 150ms ease" }}
          onPointerDown={(event) => {
            setDragging(true);
            setOrigin(event.clientX);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragging) return;
            const next = event.clientX - origin;
            dxRef.current = next;
            setDx(next);
          }}
          onPointerUp={() => {
            const offset = dxRef.current;
            setDragging(false);
            if (offset > 110) void choose(true);
            else if (offset < -110) void choose(false);
            else {
              dxRef.current = 0;
              setDx(0);
            }
          }}
        >
          <div className="relative">
            <Avatar name={card.name} photoId={card.photoIds[photoIndex]} className="h-80 w-full" />
            {dx > 40 ? <span className="absolute left-4 top-4 rounded-full bg-leaf px-3 py-1 text-sm text-white">Yes</span> : null}
            {dx < -40 ? <span className="absolute right-4 top-4 rounded-full bg-clay px-3 py-1 text-sm text-white">No</span> : null}
          </div>
          <div className="space-y-3 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-3xl">
                {card.name}, {card.age}
              </h2>
              <p className="text-sm text-ink/70">{card.distanceLabel}</p>
            </div>
            {card.bio ? <p className="leading-relaxed">{card.bio}</p> : null}
            <div className="flex flex-wrap gap-2">
              {card.interests.map((interest) => (
                <span key={interest} className="rounded-full bg-sand px-3 py-1 text-sm">
                  {interest}
                </span>
              ))}
            </div>
            {card.photoIds.length > 1 ? (
              <div className="flex gap-2">
                {card.photoIds.map((photoId, index) => (
                  <button
                    key={photoId}
                    type="button"
                    aria-label={`Photo ${index + 1}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setPhotoIndex(index)}
                    className={index === photoIndex ? "h-2.5 w-2.5 rounded-full bg-leaf" : "h-2.5 w-2.5 rounded-full bg-sand"}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ) : null}

      {card ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" disabled={busy} onClick={() => void choose(false)} className="rounded-full bg-sand py-3 text-sm font-medium disabled:opacity-50">
            No
          </button>
          <button type="button" disabled={busy} onClick={() => void choose(true)} className="rounded-full bg-leaf py-3 text-sm font-medium text-white disabled:opacity-50">
            Yes
          </button>
        </div>
      ) : null}
    </div>
  );
}
