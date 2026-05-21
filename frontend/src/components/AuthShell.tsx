import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { t } from "../theme/atmos";
import { Logo } from "./Logo";

// Centered auth card on the ATMOS radial-gradient + masked grid backdrop.
export function AuthShell({ children, footerRight }: { children: ReactNode; footerRight?: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(168,85,247,0.15) 0%, transparent 50%),
          radial-gradient(ellipse 80% 60% at 80% 100%, rgba(59,130,246,0.10) 0%, transparent 50%),
          ${t.bg}`,
        color: t.text,
        fontFamily: t.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* masked grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          pointerEvents: "none",
          backgroundImage: `linear-gradient(${t.rule} 1px, transparent 1px), linear-gradient(90deg, ${t.rule} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, #000 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, #000 30%, transparent 100%)",
        }}
      />

      {/* top bar */}
      <div style={{ position: "relative", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/auth/signin" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: t.text }}>
          <Logo size={22} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>yslabs</span>
        </Link>
        <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ color: t.muted, fontSize: 13.5, textDecoration: "none" }}>
          Docs
        </a>
      </div>

      <div style={{ position: "relative", flex: 1, display: "grid", placeItems: "center", padding: 32 }}>
        <div className="atmos-fade" style={{ width: 420, maxWidth: "100%" }}>
          {children}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: t.muted2,
          fontFamily: t.mono,
        }}
      >
        <span>youngstorage labs · v0.6</span>
        {footerRight}
      </div>
    </div>
  );
}
