import { useCallback, useEffect, useState } from "react";
import { useTheme, useThemeMode, type ThemeMode } from "../theme/ThemeContext";
import { Page } from "../components/Page";
import { Nav } from "../components/Nav";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { useAuth } from "../auth/AuthContext";
import { adminApi, type AdminStats, type AdminUser } from "../api/admin";
import { ApiError } from "../api/client";
import type { UserRole } from "../api/types";

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  const t = useTheme();
  return (
    <div style={{ background: t.card, border: `1px solid ${t.rule}`, borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 12, color: t.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.4 }}>{value}</span>
        {sub && <span style={{ fontSize: 12, color: t.muted }}>{sub}</span>}
      </div>
    </div>
  );
}

function StatSkeleton() {
  const t = useTheme();
  return (
    <div style={{ background: t.card, border: `1px solid ${t.rule}`, borderRadius: 10, padding: 16 }}>
      <Skeleton w={56} h={12} />
      <div style={{ marginTop: 12 }}>
        <Skeleton w={70} h={26} />
      </div>
    </div>
  );
}

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function AppearanceCard() {
  const t = useTheme();
  const { mode, resolved, setMode } = useThemeMode();
  return (
    <Card title="Appearance">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, color: t.muted }}>
          Choose how the workspace looks. “System” follows your device setting (currently {resolved}).
        </div>
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            background: t.bg2,
            border: `1px solid ${t.rule2}`,
            borderRadius: 8,
            padding: 3,
            gap: 3,
          }}
        >
          {THEME_MODES.map((m) => {
            const on = mode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                aria-pressed={on}
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: on ? t.cardHi : "transparent",
                  color: on ? t.text2 : t.muted,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export function Settings() {
  const t = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuper = user?.role === "superadmin";

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const [s, u] = await Promise.allSettled([adminApi.stats(), adminApi.listUsers()]);
    if (s.status === "fulfilled") setStats(s.value);
    if (u.status === "fulfilled") setUsers(u.value);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeRole(u: AdminUser, role: UserRole) {
    setBusy(u.id);
    setError(null);
    try {
      await adminApi.setRole(u.id, role);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change role");
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(u: AdminUser) {
    setBusy(u.id);
    setError(null);
    try {
      await adminApi.setActive(u.id, !u.is_active);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
    } finally {
      setBusy(null);
    }
  }

  const roleOptions: UserRole[] = isSuper ? ["user", "admin", "superadmin"] : ["user", "admin"];

  return (
    <Page>
      <Nav />
      <div className="atmos-fade" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>Settings</div>
          <div style={{ color: t.muted, fontSize: 14, marginTop: 4 }}>Your account{isAdmin ? " and platform administration." : "."}</div>
        </div>

        {/* Account */}
        <Card title="Account">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {[
              ["Email", user?.email],
              ["Username", user?.username],
              ["Role", user?.role],
              ["Verified", user?.is_verified ? "yes" : "no"],
              ["Member since", user ? new Date(user.created_at).toLocaleDateString() : "—"],
            ].map(([k, v]) => (
              <div key={k as string}>
                <div style={{ fontSize: 12, color: t.muted }}>{k}</div>
                <div style={{ fontSize: 14, marginTop: 3, fontFamily: t.mono, textTransform: k === "Role" ? "capitalize" : "none" }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        <AppearanceCard />

        {!isAdmin && (
          <Card title="Administration">
            <div style={{ color: t.muted2, fontSize: 13 }}>
              Admin tools (users, roles, platform stats) require an admin role.
            </div>
          </Card>
        )}

        {isAdmin && (
          <>
            {error && (
              <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.red}55`, background: `${t.red}14`, color: t.red, fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* platform stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {loading ? (
                <>
                  <StatSkeleton />
                  <StatSkeleton />
                  <StatSkeleton />
                  <StatSkeleton />
                </>
              ) : (
                <>
                  <StatCard label="Users" value={stats?.users_total ?? "—"} sub={stats ? `${stats.users_verified} verified` : ""} />
                  <StatCard label="Labs" value={stats?.labs_running ?? "—"} sub={stats ? `of ${stats.labs_total} total` : ""} />
                  <StatCard label="Peers" value={stats?.peers_total ?? "—"} sub="wireguard" />
                  <StatCard label="Databases" value={stats?.databases_total ?? "—"} sub="managed" />
                </>
              )}
            </div>

            {/* tenants */}
            <Card title={`Users · ${users.length}`} padded={false}>
              <div style={{ overflowX: "auto" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.2fr 1fr 140px 1fr",
                    padding: "10px 18px",
                    borderBottom: `1px solid ${t.rule}`,
                    fontSize: 11,
                    color: t.muted,
                    fontWeight: 500,
                    minWidth: 720,
                  }}
                >
                  <span>User</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span>Labs / Peers / DBs</span>
                  <span style={{ textAlign: "right" }}>Actions</span>
                </div>
                {loading
                  ? [0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1.2fr 1fr 140px 1fr",
                          padding: "12px 18px",
                          borderBottom: `1px solid ${t.rule}`,
                          alignItems: "center",
                          minWidth: 720,
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <Skeleton w="50%" h={13} />
                          <Skeleton w="72%" h={11} />
                        </div>
                        <Skeleton w={84} h={26} r={6} />
                        <Skeleton w={64} h={18} r={999} />
                        <Skeleton w={70} h={12} />
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Skeleton w={72} h={28} r={6} />
                        </div>
                      </div>
                    ))
                  : users.map((u) => {
                  const self = u.id === user?.id;
                  const locked = self || (u.role === "superadmin" && !isSuper);
                  return (
                    <div
                      key={u.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1.2fr 1fr 140px 1fr",
                        padding: "12px 18px",
                        borderBottom: `1px solid ${t.rule}`,
                        alignItems: "center",
                        minWidth: 720,
                        opacity: u.is_active ? 1 : 0.55,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>
                          {u.username} {self && <span style={{ color: t.muted2, fontSize: 12 }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: 12, color: t.muted, fontFamily: t.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.email}
                        </div>
                      </div>
                      <div>
                        <select
                          value={u.role}
                          disabled={locked || busy === u.id}
                          onChange={(e) => void changeRole(u, e.target.value as UserRole)}
                          style={{
                            background: t.bg2,
                            color: t.text,
                            border: `1px solid ${t.rule2}`,
                            borderRadius: 6,
                            padding: "5px 8px",
                            fontSize: 12.5,
                            textTransform: "capitalize",
                            cursor: locked ? "not-allowed" : "pointer",
                          }}
                        >
                          {/* keep the current value selectable even if not in the editable set */}
                          {(roleOptions.includes(u.role) ? roleOptions : [u.role, ...roleOptions]).map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        {u.is_active ? (
                          <Badge tone={u.is_verified ? "green" : "amber"}>
                            {u.is_verified ? "active" : "unverified"}
                          </Badge>
                        ) : (
                          <Badge tone="red">suspended</Badge>
                        )}
                      </div>
                      <div style={{ fontFamily: t.mono, fontSize: 13, color: t.muted }}>
                        {u.labs} / {u.peers} / {u.databases}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <Button
                          size="sm"
                          danger={u.is_active}
                          disabled={locked || busy === u.id}
                          onClick={() => void toggleActive(u)}
                        >
                          {busy === u.id ? "…" : u.is_active ? "Suspend" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </Page>
  );
}
