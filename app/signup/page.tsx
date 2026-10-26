"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          birthDate: form.get("birthDate"),
          gender: form.get("gender"),
        }),
      });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-serif text-4xl">Create an account</h1>
      <p className="mt-2 text-sm text-ink/70">FriendSpace is for people 18 and older.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Name
          <input name="name" required maxLength={40} autoComplete="name" className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2" />
        </label>
        <label className="block text-sm">
          Email
          <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2" />
        </label>
        <label className="block text-sm">
          Password
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2" />
        </label>
        <label className="block text-sm">
          Birth date
          <input name="birthDate" type="date" required className="mt-1 w-full rounded-xl border border-sand bg-paper px-3 py-2" />
        </label>
        <fieldset className="text-sm">
          <legend>I am</legend>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="gender" value="WOMAN" required /> Woman
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="gender" value="MAN" /> Man
            </label>
          </div>
        </fieldset>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        <button type="submit" disabled={pending} className="rounded-full bg-leaf px-5 py-2.5 text-white disabled:opacity-50">
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink/70">
        Already have an account? <Link href="/login" className="text-leaf">Log in</Link>
      </p>
    </main>
  );
}
