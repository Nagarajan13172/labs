import type { CSSProperties, ReactNode } from "react";
import { t } from "../theme/atmos";

// Dark app surface. `gradient` adds the auth-screen radial glow + grid.
export function Page({
  children,
  style,
  gradient,
}: {
  children: ReactNode;
  style?: CSSProperties;
  gradient?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: gradient
          ? `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(168,85,247,0.15) 0%, transparent 50%),
             radial-gradient(ellipse 80% 60% at 80% 100%, rgba(59,130,246,0.10) 0%, transparent 50%),
             ${t.bg}`
          : t.bg,
        color: t.text,
        fontFamily: t.sans,
        fontSize: 14,
        position: "relative",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
