import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useTheme } from "../theme/ThemeContext";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode; // right-aligned small text/link (e.g. "Forgot?")
}

// V4 labelled input — dark surface, blue focus ring.
export function Field({ label, hint, style, ...rest }: Props) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        style={{
          fontSize: 13,
          color: t.muted,
          fontWeight: 500,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span>{label}</span>
        {hint}
      </label>
      <input
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: "11px 14px",
          background: t.bg2,
          border: `1px solid ${focused ? t.blue : t.rule2}`,
          boxShadow: focused ? `0 0 0 3px ${t.blue}30` : "none",
          borderRadius: 8,
          fontSize: 14,
          outline: "none",
          transition: "border-color 0.12s ease, box-shadow 0.12s ease",
          ...style,
        }}
        {...rest}
      />
    </div>
  );
}
