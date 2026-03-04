"use client";

import { useEffect, useState } from "react";

export function UpgradeBanner() {
  const [tier, setTier] = useState<"free" | "pro" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((d) => {
        setTier(d.tier ?? "free");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade() {
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else if (data.error) alert(data.error);
  }

  if (loading || tier === "pro") return null;

  return (
    <div className="rounded-lg border border-pitch-500/50 bg-pitch-500/10 px-4 py-2">
      <button
        type="button"
        onClick={handleUpgrade}
        className="text-sm font-medium text-pitch-400 hover:text-pitch-300"
      >
        Upgrade to Pro – Match Preview & full access
      </button>
    </div>
  );
}
