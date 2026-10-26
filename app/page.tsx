import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm uppercase tracking-[0.18em] text-leaf">Nearby, a few at a time</p>
      <h1 className="mt-3 font-serif text-5xl leading-tight">FriendSpace</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink/80">
        Like people close to you. Once a week, three to six of you are grouped from those likes and shared interests.
        Spend the week talking, then stay, leave, or keep going one to one.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/signup" className="rounded-full bg-leaf px-5 py-3 text-white">
          Create an account
        </Link>
        <Link href="/login" className="rounded-full bg-sand px-5 py-3">
          Log in
        </Link>
      </div>
    </main>
  );
}
