import { useRef, useCallback } from "react";
import { motion } from "motion/react";

interface CircularGaugeProps {
  value: number;
  onChange: (val: number) => void;
  size?: number;
}

function getRatingLabel(v: number) {
  if (v >= 9.5) return "MÜKEMMEL";
  if (v >= 8.5) return "HARİKA";
  if (v >= 7.5) return "ÇOK İYİ";
  if (v >= 6.5) return "İYİ";
  if (v >= 5.5) return "ORTA";
  if (v >= 4.5) return "KÖTÜ";
  if (v >= 3) return "ÇOK KÖTÜ";
  return "FELAKETİ";
}

function getRatingColor(v: number) {
  if (v >= 8) return "#C8FF00";
  if (v >= 6) return "#FFD600";
  if (v >= 4) return "#FF9500";
  return "#FF3B30";
}

export function CircularGauge({ value, onChange, size = 260 }: CircularGaugeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 30;

  const startAngle = 135;
  const totalSweep = 270;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const sweepAngle = ((value - 1) / 9) * totalSweep;

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

  const thumbRad = toRad(startAngle + sweepAngle);
  const thumbX = cx + radius * Math.cos(thumbRad);
  const thumbY = cy + radius * Math.sin(thumbRad);

  const ticks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const getValueFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = size / rect.width;
      const scaleY = size / rect.height;
      const x = (clientX - rect.left) * scaleX - cx;
      const y = (clientY - rect.top) * scaleY - cy;

      let angle = (Math.atan2(y, x) * 180) / Math.PI;
      if (angle < 0) angle += 360;

      let relAngle = angle - startAngle;
      if (relAngle < 0) relAngle += 360;
      if (relAngle > totalSweep + 20) relAngle = 0;
      if (relAngle > totalSweep) relAngle = totalSweep;

      const newValue = 1 + (relAngle / totalSweep) * 9;
      const clamped = Math.max(1, Math.min(10, newValue));
      const rounded = Math.round(clamped * 2) / 2;
      onChange(rounded);
    },
    [cx, cy, size, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    getValueFromEvent(e.clientX, e.clientY);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    getValueFromEvent(e.clientX, e.clientY);
  };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    const t = e.touches[0];
    getValueFromEvent(t.clientX, t.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const t = e.touches[0];
    getValueFromEvent(t.clientX, t.clientY);
  };
  const handleTouchEnd = () => { isDragging.current = false; };

  const color = getRatingColor(value);

  return (
    <div className="flex flex-col items-center select-none">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ touchAction: "none", cursor: "pointer" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <defs>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="thumbGlow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity={0.07} />
            <stop offset="100%" stopColor="transparent" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Center ambient */}
        <circle cx={cx} cy={cy} r={radius - 8} fill="url(#centerGrad)" />

        {/* Background track */}
        <path
          d={arcPath(startAngle, totalSweep)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={18}
          strokeLinecap="round"
        />
        {/* Inner background track */}
        <path
          d={arcPath(startAngle, totalSweep)}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={12}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {sweepAngle > 0 && (
          <path
            d={arcPath(startAngle, sweepAngle)}
            fill="none"
            stroke={color}
            strokeWidth={18}
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
          />
        )}

        {/* Tick marks */}
        {ticks.map((tick) => {
          const tickSweep = ((tick - 1) / 9) * totalSweep;
          const tickAngle = toRad(startAngle + tickSweep);
          const innerR = radius - 22;
          const outerR = radius - 12;
          const tx1 = cx + innerR * Math.cos(tickAngle);
          const ty1 = cy + innerR * Math.sin(tickAngle);
          const tx2 = cx + outerR * Math.cos(tickAngle);
          const ty2 = cy + outerR * Math.sin(tickAngle);
          const labelR = radius - 36;
          const lx = cx + labelR * Math.cos(tickAngle);
          const ly = cy + labelR * Math.sin(tickAngle);
          const isActive = tick <= value;
          return (
            <g key={tick}>
              <line
                x1={tx1} y1={ty1} x2={tx2} y2={ty2}
                stroke={isActive ? color : "rgba(255,255,255,0.15)"}
                strokeWidth={tick % 2 === 0 ? 2.5 : 1.5}
                strokeLinecap="round"
                opacity={isActive ? 0.9 : 0.5}
              />
              {tick % 2 === 0 && (
                <text
                  x={lx} y={ly + 4}
                  textAnchor="middle"
                  fill={isActive ? color : "rgba(255,255,255,0.2)"}
                  fontSize={10}
                  fontWeight="700"
                >
                  {tick}
                </text>
              )}
            </g>
          );
        })}

        {/* Thumb */}
        <circle
          cx={thumbX} cy={thumbY} r={14}
          fill={color}
          opacity={0.2}
          filter="url(#thumbGlow)"
        />
        <circle
          cx={thumbX} cy={thumbY} r={10}
          fill={color}
          filter="url(#thumbGlow)"
        />
        <circle cx={thumbX} cy={thumbY} r={5} fill="#0A0A0F" />

        {/* Center value */}
        <text
          x={cx} y={cy + 6}
          textAnchor="middle"
          fill={color}
          fontSize={56}
          fontWeight="900"
          style={{ letterSpacing: "-2px" }}
        >
          {value.toFixed(1)}
        </text>
      </svg>

      {/* Label pill */}
      <motion.div
        animate={{
          background: `${color}18`,
          borderColor: `${color}44`,
        }}
        className="px-5 py-2 rounded-full mt-1"
        style={{
          border: `1px solid ${color}44`,
        }}
      >
        <span style={{ color, fontSize: 13, fontWeight: 800, letterSpacing: "0.1em" }}>
          {getRatingLabel(value)}
        </span>
      </motion.div>
    </div>
  );
}
