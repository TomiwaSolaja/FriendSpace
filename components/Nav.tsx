"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/app", label: "Swipe" },
  { href: "/app/groups", label: "Groups" },
  { href: "/app/messages", label: "Messages" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-sand bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/app" className="font-serif text-xl">
          FriendSpace
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {links.map((link) => {
            const active = link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "rounded-full bg-leaf px-3 py-1.5 text-white" : "rounded-full px-3 py-1.5 text-ink/70"}
              >
                {link.label}
              </Link>
            );
          })}
          <button type="button" onClick={() => void logout()} className="rounded-full px-3 py-1.5 text-ink/70">
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
