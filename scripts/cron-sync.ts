/**
 * Daily cron: sync fixtures for yesterday/today and recalculate referee scores.
 * Run: CRON_SECRET=xxx API_FOOTBALL_KEY=xxx npx tsx scripts/cron-sync.ts
 * Or call POST /api/ingest with Authorization: Bearer <CRON_SECRET> and body { date, leagueId?, recalculate: true }
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

async function run() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().slice(0, 10);

  const res = await fetch(`${APP_URL}/api/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {}),
    },
    body: JSON.stringify({ date, recalculate: true }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Cron sync failed:", data);
    process.exit(1);
  }
  console.log("Cron sync ok:", data);
}

run();
