"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: "Check your email to confirm your account." });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-2">Referee Intelligence Engine</h1>
        <p className="text-zinc-400 text-sm text-center mb-6">Sign in or create an account</p>
        <form onSubmit={signIn} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-pitch-500 focus:outline-none focus:ring-1 focus:ring-pitch-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-pitch-500 focus:outline-none focus:ring-1 focus:ring-pitch-500"
            required
          />
          {message && (
            <p className={`text-sm ${message.type === "error" ? "text-red-400" : "text-pitch-400"}`}>
              {message.text}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-pitch-600 px-4 py-2.5 font-medium text-white hover:bg-pitch-500 disabled:opacity-50"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={signUp}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-600 px-4 py-2.5 font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
