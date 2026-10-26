"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { api } from "@/lib/client";

type Me = {
  name: string;
  bio: string;
  gender: "MAN" | "WOMAN";
  photos: { id: string }[];
  interests: { id: string; name: string }[];
};

type Interest = { id: string; name: string };

export function ProfileEditor() {
  const [me, setMe] = useState<Me | null>(null);
  const [catalog, setCatalog] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const [profile, interests] = await Promise.all([
      api<Me>("/api/me"),
      api<{ interests: Interest[] }>("/api/interests"),
    ]);
    setMe(profile);
    setCatalog(interests.interests);
    setSelected(profile.interests.map((interest) => interest.id));
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<Me>("/api/me"), api<{ interests: Interest[] }>("/api/interests")]).then(
      ([profile, interests]) => {
        if (cancelled) return;
        setMe(profile);
        setCatalog(interests.interests);
        setSelected(profile.interests.map((interest) => interest.id));
      },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your profile");
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 8) {
        setError("Pick up to 8 interests");
        return current;
      }
      setError("");
      return [...current, id];
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!me) return;
    setPending(true);
    setSaved("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const updated = await api<Me>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          bio: form.get("bio"),
          gender: form.get("gender"),
          interestIds: selected,
        }),
      });
      setMe(updated);
      setSaved("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  async function upload(file: File) {
    setError("");
    const body = new FormData();
    body.set("file", file);
    try {
      await api("/api/me/photos", { method: "POST", body });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that photo");
    }
  }

  async function removePhoto(id: string) {
    setError("");
    try {
      await api(`/api/me/photos/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that photo");
    }
  }

  if (!me) return <p className="text-ink/70">{error || "Loading profile…"}</p>;

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl">Your profile</h1>
        <Link href="/app/settings" className="text-sm text-leaf">
          Distance and preferences
        </Link>
      </div>

      <div className="mt-5 flex gap-3 overflow-x-auto">
        {me.photos.map((photo) => (
          <div key={photo.id} className="relative">
            <Avatar name={me.name} photoId={photo.id} className="h-28 w-24 rounded-2xl" />
            <button type="button" onClick={() => void removePhoto(photo.id)} className="mt-1 text-xs text-clay">
              Remove
            </button>
          </div>
        ))}
        {me.photos.length < 6 ? (
          <label className="flex h-28 w-24 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-sand bg-paper text-center text-xs text-ink/70">
            Add photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Name
          <input name="name" defaultValue={me.name} required maxLength={40} className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2" />
        </label>
        <label className="block text-sm">
          Bio
          <textarea name="bio" defaultValue={me.bio} maxLength={500} rows={4} className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2" />
        </label>
        <fieldset className="text-sm">
          <legend>I am</legend>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="gender" value="WOMAN" defaultChecked={me.gender === "WOMAN"} /> Woman
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="gender" value="MAN" defaultChecked={me.gender === "MAN"} /> Man
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm">Interests ({selected.length}/8)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {catalog.map((interest) => {
              const on = selected.includes(interest.id);
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => toggle(interest.id)}
                  className={on ? "rounded-full bg-leaf px-3 py-1 text-sm text-white" : "rounded-full bg-sand px-3 py-1 text-sm"}
                >
                  {interest.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        {saved ? <p className="text-sm text-leaf">{saved}</p> : null}
        <button type="submit" disabled={pending} className="rounded-full bg-leaf px-5 py-2.5 text-sm text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
