"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? null));
  }, [supabase.auth]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-pitch-400">
            Referee Intelligence
          </Link>
          <Link
            href="/dashboard"
            className={`text-sm ${
              pathname === "/dashboard"
                ? "text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/referees"
            className={`text-sm ${
              pathname.startsWith("/dashboard/referees")
                ? "text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Referees
          </Link>
          <Link
            href="/matches"
            className={`text-sm ${
              pathname.startsWith("/matches")
                ? "text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Match Preview
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {email && <span className="text-sm text-zinc-500">{email}</span>}
          <button
            onClick={signOut}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
