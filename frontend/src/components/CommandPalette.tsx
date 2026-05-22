import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { t } from "../theme/atmos";
import { useAuth } from "../auth/AuthContext";
import { labsApi } from "../api/labs";
import { networkApi } from "../api/network";
import { servicesApi } from "../api/services";

interface Item {
  id: string;
  label: string;
  sub: string;
  kind: string;
  keywords: string;
  run: () => void;
}

// ⌘K command palette: jump to any page or live resource (lab, peers, databases).
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { signout } = useAuth();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [resources, setResources] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const go = (to: string) => () => {
    navigate(to);
    onClose();
  };

  const baseItems: Item[] = useMemo(
    () => [
      { id: "nav-overview", label: "Overview", sub: "Dashboard", kind: "Page", keywords: "home dashboard", run: go("/") },
      { id: "nav-labs", label: "Labs", sub: "Manage your lab", kind: "Page", keywords: "lab container code-server", run: go("/labs") },
      { id: "nav-network", label: "Network", sub: "WireGuard peers & domains", kind: "Page", keywords: "vpn peer wireguard domain", run: go("/network") },
      { id: "nav-databases", label: "Databases", sub: "Managed databases", kind: "Page", keywords: "db mysql mariadb mongodb", run: go("/databases") },
      { id: "nav-jobs", label: "Jobs", sub: "Background activity", kind: "Page", keywords: "jobs celery mqtt tasks", run: go("/jobs") },
      { id: "nav-settings", label: "Settings", sub: "Admin", kind: "Page", keywords: "settings admin", run: go("/admin") },
      { id: "act-deploy", label: "Deploy a lab", sub: "Provision code-server", kind: "Action", keywords: "deploy new lab", run: go("/labs") },
      { id: "act-add-peer", label: "Add a device", sub: "New WireGuard peer", kind: "Action", keywords: "add peer device vpn", run: go("/network") },
      { id: "act-new-db", label: "New database", sub: "Provision a database", kind: "Action", keywords: "new database create", run: go("/databases") },
      { id: "act-signout", label: "Sign out", sub: "End your session", kind: "Action", keywords: "logout sign out", run: () => { onClose(); void signout(); } },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Load live resources whenever the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    (async () => {
      const [l, p, d] = await Promise.allSettled([
        labsApi.get(),
        networkApi.listPeers(),
        servicesApi.listDatabases(),
      ]);
      const items: Item[] = [];
      if (l.status === "fulfilled" && l.value) {
        const lab = l.value;
        items.push({ id: `lab-${lab.id}`, label: lab.name, sub: `lab · ${lab.status}`, kind: "Lab", keywords: `lab ${lab.name} ${lab.status}`, run: go("/labs") });
      }
      if (p.status === "fulfilled") {
        for (const peer of p.value)
          items.push({ id: `peer-${peer.id}`, label: peer.device_name, sub: `peer · ${peer.address}`, kind: "Peer", keywords: `peer ${peer.device_name} ${peer.address}`, run: go("/network") });
      }
      if (d.status === "fulfilled") {
        for (const db of d.value)
          items.push({ id: `db-${db.id}`, label: db.db_name, sub: `database · ${db.engine}`, kind: "Database", keywords: `database ${db.db_name} ${db.engine}`, run: go("/databases") });
      }
      setResources(items);
    })();
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const all = [...baseItems, ...resources];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((i) => `${i.label} ${i.sub} ${i.keywords}`.toLowerCase().includes(q));
  }, [query, baseItems, resources]);

  // Keep the highlight in range as the list shrinks.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        style={{
          width: 560,
          maxWidth: "92vw",
          background: t.card,
          border: `1px solid ${t.rule2}`,
          borderRadius: 12,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${t.rule}` }}>
          <svg width="15" height="15" viewBox="0 0 13 13" fill="none" stroke={t.muted} strokeWidth="1.5">
            <circle cx="5.5" cy="5.5" r="4" />
            <path d="M8.5 8.5l3 3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, labs, peers, databases…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, color: t.text }}
          />
          <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted2, border: `1px solid ${t.rule2}`, borderRadius: 4, padding: "1px 6px" }}>esc</span>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto", padding: 6 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "20px 16px", color: t.muted2, fontSize: 13 }}>No results for “{query}”.</div>
          )}
          {filtered.map((item, i) => {
            const on = i === active;
            return (
              <button
                key={item.id}
                onMouseEnter={() => setActive(i)}
                onClick={item.run}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: on ? t.cardHi : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: t.text,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 12, color: t.muted, fontFamily: t.mono, marginTop: 2 }}>{item.sub}</div>
                </div>
                <span style={{ fontSize: 11, color: t.muted2, border: `1px solid ${t.rule2}`, borderRadius: 999, padding: "2px 8px" }}>
                  {item.kind}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 14, padding: "8px 16px", borderTop: `1px solid ${t.rule}`, fontSize: 11, color: t.muted2, fontFamily: t.mono }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
