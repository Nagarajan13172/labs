import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeContext";

export type Tone = "green" | "amber" | "red" | "blue" | "muted";

// Dot-status pill with a soft glow on the indicator.
export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: Tone }) {
  const t = useTheme();
  const dot: Record<Tone, string> = {
    green: t.green,
    amber: t.amber,
    red: t.red,
    blue: t.blue,
    muted: t.muted,
  };
  const c = dot[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        fontSize: 12,
        fontWeight: 500,
        background: t.cardHi,
        color: t.text,
        border: `1px solid ${t.rule2}`,
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          background: c,
          borderRadius: 999,
          boxShadow: `0 0 8px ${c}80`,
        }}
      />
      {children}
    </span>
  );
}
