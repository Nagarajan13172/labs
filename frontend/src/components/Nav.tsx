import { useNavigate, useLocation } from "react-router-dom";
import { t, gradient } from "../theme/atmos";
import { Logo } from "./Logo";
import { useAuth } from "../auth/AuthContext";

const TABS: [string, string][] = [
  ["/", "Overview"],
  ["/labs", "Labs"],
  ["/network", "Network"],
  ["/databases", "Databases"],
  ["/jobs", "Jobs"],
  ["/admin", "Settings"],
];

export function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signout } = useAuth();

  const active = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <div style={{ borderBottom: `1px solid ${t.rule}`, background: t.bg, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ padding: "14px 28px", display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", color: t.text }}
        >
          <Logo size={22} />
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: -0.2 }}>yslabs</span>
        </button>
        <span style={{ color: t.muted2 }}>/</span>
        <span style={{ fontSize: 14, color: t.text }}>{user?.username ?? "—"}</span>
        <span
          style={{
            marginLeft: 4,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 500,
            color: t.muted,
            border: `1px solid ${t.rule2}`,
            borderRadius: 999,
            textTransform: "capitalize",
          }}
        >
          {user?.role ?? "user"}
        </span>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 10px 6px 12px",
            border: `1px solid ${t.rule2}`,
            borderRadius: 6,
            fontSize: 13,
            color: t.muted,
            background: t.bg2,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="5.5" cy="5.5" r="4" />
            <path d="M8.5 8.5l3 3" />
          </svg>
          <span>Search…</span>
          <span style={{ marginLeft: 24, padding: "1px 5px", background: t.cardHi, borderRadius: 3, fontFamily: t.mono, fontSize: 11 }}>
            ⌘K
          </span>
        </div>

        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          style={{ background: "transparent", border: `1px solid ${t.rule2}`, color: t.text, padding: "6px 12px", borderRadius: 6, fontSize: 13, textDecoration: "none" }}
        >
          Docs
        </a>
        <button
          onClick={() => navigate("/labs")}
          style={{ background: t.text2, color: t.bg, border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          + New
        </button>

        <button
          onClick={() => void signout()}
          title="Sign out"
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
            color: t.bg,
            border: "none",
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          {(user?.username ?? "?").charAt(0)}
        </button>
      </div>

      <div style={{ display: "flex", padding: "0 20px" }}>
        {TABS.map(([path, label]) => {
          const on = active(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                padding: "12px 14px",
                fontSize: 13.5,
                fontWeight: 500,
                color: on ? t.text2 : t.muted,
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${on ? t.text2 : "transparent"}`,
                marginBottom: -1,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
