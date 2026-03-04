interface HexRatingProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function HexRating({ score, size = "md" }: HexRatingProps) {
  const sizeMap = {
    sm: { outer: 62, fontSize: 17, sub: 8 },
    md: { outer: 78, fontSize: 22, sub: 10 },
    lg: { outer: 96, fontSize: 28, sub: 11 },
  };
  const s = sizeMap[size];

  const color =
    score >= 8 ? "#C8FF00" : score >= 6.5 ? "#FFD600" : "#FF5F5F";

  return (
    <div
      className="flex flex-col items-center justify-center relative"
      style={{ width: s.outer, height: s.outer }}
    >
      {/* Glow behind hex */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          filter: "blur(4px)",
        }}
      />

      {/* Hexagon background */}
      <svg
        width={s.outer}
        height={s.outer}
        viewBox="0 0 80 80"
        className="absolute inset-0"
      >
        <polygon
          points="40,4 74,22 74,58 40,76 6,58 6,22"
          fill={color}
          opacity={0.1}
        />
        <polygon
          points="40,4 74,22 74,58 40,76 6,58 6,22"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity={0.7}
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center" style={{ gap: 0 }}>
        <span style={{ fontSize: s.fontSize, color, fontWeight: 900, lineHeight: 1 }}>
          {score.toFixed(1)}
        </span>
        <span
          style={{
            fontSize: s.sub,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.06em",
            marginTop: 1,
          }}
        >
          PUAN
        </span>
      </div>
    </div>
  );
}
