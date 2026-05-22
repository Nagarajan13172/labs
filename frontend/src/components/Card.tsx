import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "../theme/ThemeContext";

// Rounded dark card with an optional title row + right-aligned action slot.
export function Card({
  title,
  action,
  children,
  style,
  bodyStyle,
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  padded?: boolean;
}) {
  const t = useTheme();
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.rule}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${t.rule}`,
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 500, color: t.text2 }}>{title}</div>
          {action}
        </div>
      )}
      <div style={{ flex: 1, padding: padded ? 18 : 0, minHeight: 0, ...bodyStyle }}>{children}</div>
    </div>
  );
}
