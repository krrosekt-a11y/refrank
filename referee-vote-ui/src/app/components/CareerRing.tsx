interface CareerRingProps {
  score: number;
  size?: number;
}

export function CareerRing({ score, size = 140 }: CareerRingProps) {
  const radius = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = 135;
  const totalSweep = 270;
  const percentage = score / 10;
  const sweepAngle = totalSweep * percentage;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (startDeg: number, sweepDeg: number) => {
    if (sweepDeg <= 0) return "";
    const start = toRad(startDeg);
    const end = toRad(startDeg + sweepDeg);
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const largeArc = sweepDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const endRad = toRad(startAngle + sweepAngle);
  const dotX = cx + radius * Math.cos(endRad);
  const dotY = cy + radius * Math.sin(endRad);

  const scoreColor =
    score >= 8 ? "#C8FF00" : score >= 6.5 ? "#FFD600" : "#FF5F5F";

  const uniqueId = `careerRing_${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={`${uniqueId}_glow`}>
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`${uniqueId}_centerGrad`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={scoreColor} stopOpacity={0.06} />
          <stop offset="100%" stopColor="transparent" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Center ambient glow */}
      <circle cx={cx} cy={cy} r={radius + 4} fill={`url(#${uniqueId}_centerGrad)`} />

      {/* Background track */}
      <path
        d={arcPath(startAngle, totalSweep)}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={11}
        strokeLinecap="round"
      />

      {/* Secondary track (slightly brighter) */}
      <path
        d={arcPath(startAngle, totalSweep)}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={7}
        strokeLinecap="round"
      />

      {/* Filled arc */}
      {sweepAngle > 0 && (
        <path
          d={arcPath(startAngle, sweepAngle)}
          fill="none"
          stroke={scoreColor}
          strokeWidth={11}
          strokeLinecap="round"
          filter={`url(#${uniqueId}_glow)`}
        />
      )}

      {/* Glow dot at end */}
      {sweepAngle > 0 && (
        <>
          <circle
            cx={dotX}
            cy={dotY}
            r={9}
            fill={scoreColor}
            opacity={0.25}
            filter={`url(#${uniqueId}_glow)`}
          />
          <circle cx={dotX} cy={dotY} r={5} fill={scoreColor} />
        </>
      )}

      {/* Center text */}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill={scoreColor}
        fontSize={size > 130 ? 32 : 24}
        fontWeight="900"
        style={{ letterSpacing: "-1px" }}
      >
        {score.toFixed(1)}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="rgba(255,255,255,0.3)"
        fontSize={9}
        letterSpacing="1.5"
        fontWeight="600"
      >
        DİSİPLİN ENDEKSİ
      </text>
      <text
        x={cx}
        y={cy + 28}
        textAnchor="middle"
        fill={`${scoreColor}88`}
        fontSize={9}
      >
        %{Math.round(percentage * 100)}
      </text>
    </svg>
  );
}
