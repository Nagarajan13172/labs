import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { gradient } from "../theme/atmos";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";

// Avatar button that opens a dropdown with profile / settings / logout.
export function UserMenu() {
  const t = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close when the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  const go = (to: string) => () => {
    navigate(to);
    setOpen(false);
  };

  const item: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    padding: "9px 12px",
    fontSize: 13.5,
    color: t.text,
    cursor: "pointer",
    borderRadius: 6,
  };
  const hover = (on: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = on ? t.cardHi : "transparent";
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
          color: "#fff",
          border: open ? `2px solid ${t.text2}` : "none",
          cursor: "pointer",
          textTransform: "uppercase",
        }}
      >
        {(user?.username ?? "?").charAt(0)}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: 38,
            right: 0,
            width: 240,
            background: t.card,
            border: `1px solid ${t.rule2}`,
            borderRadius: 10,
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            padding: 6,
            zIndex: 60,
          }}
        >
          {/* identity header */}
          <div style={{ padding: "8px 12px 10px", borderBottom: `1px solid ${t.rule}`, marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {(user?.username ?? "?").charAt(0)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.username}
                </div>
                <div style={{ fontSize: 12, color: t.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.email}
                </div>
              </div>
            </div>
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "2px 8px",
                fontSize: 11,
                color: t.muted,
                border: `1px solid ${t.rule2}`,
                borderRadius: 999,
                textTransform: "capitalize",
              }}
            >
              {user?.role ?? "user"}
            </span>
          </div>

          <button role="menuitem" style={item} onMouseEnter={hover(true)} onMouseLeave={hover(false)} onClick={go("/profile")}>
            <IconUser t={t.muted} /> Profile
          </button>
          <button role="menuitem" style={item} onMouseEnter={hover(true)} onMouseLeave={hover(false)} onClick={go("/admin")}>
            <IconGear t={t.muted} /> Settings
          </button>

          <div style={{ height: 1, background: t.rule, margin: "6px 0" }} />

          <button
            role="menuitem"
            style={{ ...item, color: t.red }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `${t.red}14`)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            onClick={() => {
              setOpen(false);
              void signout();
            }}
          >
            <IconLogout /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

function IconUser({ t }: { t: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}
function IconGear({ t }: { t: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
