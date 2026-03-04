import { motion } from "motion/react";

interface CategorySliderProps {
  label: string;
  icon: string;
  value: number;
  onChange: (val: number) => void;
  description?: string;
}

export function CategorySlider({
  label,
  icon,
  value,
  onChange,
  description,
}: CategorySliderProps) {
  const pct = ((value - 1) / 9) * 100;
  const color =
    value >= 8
      ? "#C8FF00"
      : value >= 6
      ? "#FFD600"
      : value >= 4
      ? "#FF9500"
      : "#FF3B30";

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 36,
              height: 36,
              background: `${color}14`,
              border: `1px solid ${color}28`,
            }}
          >
            <span style={{ fontSize: 17 }}>{icon}</span>
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
              {label}
            </div>
            {description && (
              <div style={{ color: "#44445A", fontSize: 11 }}>{description}</div>
            )}
          </div>
        </div>

        <motion.div
          animate={{ backgroundColor: `${color}18`, borderColor: `${color}44` }}
          className="rounded-2xl px-3 py-1.5 min-w-14 text-center"
          style={{
            border: `1px solid ${color}44`,
            background: `${color}18`,
          }}
        >
          <span style={{ color, fontSize: 16, fontWeight: 900 }}>
            {value.toFixed(1)}
          </span>
        </motion.div>
      </div>

      {/* Custom slider */}
      <div
        className="relative rounded-full"
        style={{ height: 6, background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${color}55`,
          }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: `calc(${pct}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: color,
            border: "2px solid rgba(10,10,15,0.8)",
            boxShadow: `0 0 8px ${color}66`,
            transition: "left 0.1s",
          }}
        />
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ margin: 0, height: "100%", touchAction: "none" }}
        />
      </div>

      {/* Scale */}
      <div
        className="flex justify-between mt-1.5"
        style={{ color: "#2E2E40", fontSize: 9, fontWeight: 600 }}
      >
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}
