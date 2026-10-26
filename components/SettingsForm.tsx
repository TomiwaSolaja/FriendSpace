"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Me = {
  interestedIn: "MEN" | "WOMEN" | "EVERYONE";
  maxDistanceMi: number;
  hasLocation: boolean;
};

export function SettingsForm() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<Me>("/api/me")
      .then(setMe)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load settings"));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved("");
    const form = new FormData(event.currentTarget);
    try {
      const updated = await api<Me>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          interestedIn: form.get("interestedIn"),
          maxDistanceMi: Number(form.get("maxDistanceMi")),
        }),
      });
      setMe(updated);
      setSaved("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setPending(false);
    }
  }

  function useLocation() {
    setError("");
    setSaved("");
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
          setMe((current) => (current ? { ...current, hasLocation: true } : current));
          setSaved("Location updated. People will see only an approximate distance.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save your location");
        }
      },
      () => setError("Location permission is needed to find people nearby."),
    );
  }

  if (!me) return <p className="text-ink/70">{error || "Loading settings…"}</p>;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl">Settings</h1>
      <p className="mt-2 text-sm text-ink/70">
        {me.hasLocation ? "Your location is saved." : "Location is not set yet, so the swipe deck is empty."}
      </p>
      <button type="button" onClick={useLocation} className="mt-4 rounded-full bg-sand px-4 py-2 text-sm">
        {me.hasLocation ? "Refresh my location" : "Use my location"}
      </button>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Show me
          <select name="interestedIn" defaultValue={me.interestedIn} className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2">
            <option value="WOMEN">Women</option>
            <option value="MEN">Men</option>
            <option value="EVERYONE">Everyone</option>
          </select>
        </label>
        <label className="block text-sm">
          Maximum distance (miles)
          <input
            name="maxDistanceMi"
            type="number"
            min={1}
            max={200}
            defaultValue={me.maxDistanceMi}
            required
            className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2"
          />
        </label>
        <p className="text-sm text-ink/70">Someone appears only if you are both inside each other&apos;s distance, and your preferences both match.</p>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        {saved ? <p className="text-sm text-leaf">{saved}</p> : null}
        <button type="submit" disabled={pending} className="rounded-full bg-leaf px-5 py-2.5 text-sm text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
