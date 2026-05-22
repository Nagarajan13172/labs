import { useTheme } from "../theme/ThemeContext";
import { Logo } from "./Logo";

// Branded full-screen loader: a spinning blue→violet conic ring around the mark.
// Used for app/auth bootstrap and route-level (Suspense) loading.
export function GlobalLoader({ label = "Loading" }: { label?: string }) {
  const t = useTheme();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${t.blue}14 0%, transparent 60%), ${t.bg}`,
        color: t.text,
      }}
    >
      <div style={{ position: "relative", width: 56, height: 56 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from 90deg, transparent 0%, ${t.blue} 45%, ${t.purple} 90%, transparent 100%)`,
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            animation: "ys-spin 0.9s linear infinite",
          }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Logo size={22} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>yslabs</span>
        <span style={{ fontSize: 12, color: t.muted, fontFamily: t.mono }}>{label}…</span>
      </div>
    </div>
  );
}
