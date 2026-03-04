type RiskLevel = "low" | "medium" | "high";

function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

const styles: Record<RiskLevel, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function RiskBadge({ score }: { score: number }) {
  const level = getRiskLevel(score);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}
    >
      {score.toFixed(1)} {level}
    </span>
  );
}
