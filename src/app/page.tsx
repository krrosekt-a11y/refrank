import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="text-center max-w-xl px-4">
        <h1 className="text-4xl font-bold mb-2">Referee Intelligence Engine</h1>
        <p className="text-zinc-400 mb-8">
          Referee ranking and risk scoring for football. Data-driven insights for referees and match previews.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-pitch-600 px-6 py-3 font-medium text-white hover:bg-pitch-500"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-600 px-6 py-3 font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
