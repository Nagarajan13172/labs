import { useTheme } from "../theme/ThemeContext";

// Hairline progress bar.
export function Progress({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const t = useTheme();
  const fill = color ?? t.blue;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ height: 4, background: t.cardHi, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: fill, borderRadius: 999 }} />
    </div>
  );
}
