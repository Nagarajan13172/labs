import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { t, gradient } from "../theme/atmos";
import { Page } from "../components/Page";
import { Nav } from "../components/Nav";
import { Card } from "../components/Card";
import { Badge, type Tone } from "../components/Badge";
import { Button } from "../components/Button";
import { Area } from "../components/Area";
import { Progress } from "../components/Progress";
import { useAuth } from "../auth/AuthContext";
import { useLabStats } from "../hooks/useLabStats";
import { labsApi } from "../api/labs";
import { networkApi } from "../api/network";
import { servicesApi } from "../api/services";
import type { Lab, ManagedDatabase, PeerStatus } from "../api/types";

const tone = (s: Lab["status"]): Tone =>
  s === "running" ? "green" : s === "failed" ? "red" : s === "stopped" ? "muted" : "amber";

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}
const fmtRate = (n: number) => `${fmtBytes(n)}/s`;
const NET_FULL = 10 * 1024 * 1024; // 10 MB/s = "full" bar (viz only)

function MetricCard({
  label,
  value,
  sub,
  color,
  spark,
}: {
  label: string;
  value: ReactNode;
  sub: string;
  color: string;
  spark: number[];
}) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.rule}`, borderRadius: 10, padding: 16, overflow: "hidden" }}>
      <div style={{ fontSize: 12, color: t.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.4, textTransform: "capitalize" }}>{value}</span>
        <span style={{ fontSize: 12, color: t.muted }}>{sub}</span>
      </div>
      <div style={{ marginTop: 8, height: 36, marginInline: -16, marginBottom: -16 }}>
        {spark.length > 1 ? (
          <Area values={spark} color={color} height={36} fillOpacity={0.3} />
        ) : (
          <div style={{ height: 36, display: "flex", alignItems: "flex-end" }}>
            <div style={{ height: 1, width: "100%", background: t.rule }} />
          </div>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lab, setLab] = useState<Lab | null>(null);
  const [peers, setPeers] = useState<PeerStatus[]>([]);
  const [dbs, setDbs] = useState<ManagedDatabase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [l, p, d] = await Promise.allSettled([
        labsApi.get(),
        networkApi.listPeers(),
        servicesApi.listDatabases(),
      ]);
      if (l.status === "fulfilled") setLab(l.value);
      if (p.status === "fulfilled") setPeers(p.value);
      if (d.status === "fulfilled") setDbs(d.value);
      setLoading(false);
    })();
  }, []);

  const running = lab?.status === "running";
  const live = useLabStats(running); // polls /labs/stats every 3s while running
  const s = live.stats;

  return (
    <Page>
      <Nav />
      <div className="atmos-fade" style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 1280, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 4 }}>
              <span style={{ color: t.muted2 }}>~ /</span> {user?.username} <span style={{ color: t.muted2 }}>/</span> overview
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>Welcome back, {user?.username}</div>
            <div style={{ color: t.muted, fontSize: 14, marginTop: 4 }}>
              {loading ? (
                "Loading workspace…"
              ) : (
                <>
                  <span style={{ color: running ? t.green : t.muted }}>● {running ? "1 lab running" : "no lab running"}</span>
                  <span style={{ color: t.muted2, margin: "0 8px" }}>·</span>
                  {peers.length} peers
                  <span style={{ color: t.muted2, margin: "0 8px" }}>·</span>
                  {dbs.length} {dbs.length === 1 ? "database" : "databases"}
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => navigate("/labs")}>Deploy lab</Button>
            {running && lab?.host_port ? (
              <a href={`http://localhost:${lab.host_port}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <Button primary>Open code-server ↗</Button>
              </a>
            ) : (
              <Button primary onClick={() => navigate("/labs")}>
                Manage lab →
              </Button>
            )}
          </div>
        </div>

        {/* live metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <MetricCard
            label="CPU"
            value={running && s ? `${s.cpu_percent}%` : "—"}
            sub={running ? "usage" : "no lab"}
            color={t.blue}
            spark={live.cpu}
          />
          <MetricCard
            label="Memory"
            value={running && s ? fmtBytes(s.mem_used) : "—"}
            sub={running && s ? `of ${fmtBytes(s.mem_limit)}` : "—"}
            color={t.purple}
            spark={live.mem}
          />
          <MetricCard
            label="Network"
            value={running ? fmtRate(live.netRate) : "—"}
            sub={running && s ? `↑ ${fmtBytes(s.tx_bytes)} · ↓ ${fmtBytes(s.rx_bytes)}` : "—"}
            color={t.cyan}
            spark={live.net}
          />
          <MetricCard
            label="Status"
            value={lab ? lab.status : "none"}
            sub={lab ? "lab" : "deploy one"}
            color={t.green}
            spark={[]}
          />
        </div>

        {/* main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
          {/* active lab */}
          <Card title="Active lab" action={<Button size="sm" ghost onClick={() => navigate("/labs")}>View all →</Button>}>
            {lab ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: 4 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.mono, fontSize: 14, color: "#fff" }}>
                      cs
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 17, fontWeight: 600 }}>{lab.name}</span>
                        <Badge tone={tone(lab.status)}>{lab.status}</Badge>
                      </div>
                      <div style={{ color: t.muted, fontSize: 13, marginTop: 4, fontFamily: t.mono }}>
                        {lab.image || "code-server"} · {lab.internal_ip}
                        {lab.host_port ? ` · :${lab.host_port}` : ""}
                      </div>
                      {lab.status_message && (
                        <div style={{ color: t.muted2, fontSize: 12, marginTop: 4 }}>{lab.status_message}</div>
                      )}
                    </div>
                  </div>
                  {running && lab.host_port ? (
                    <a href={`http://localhost:${lab.host_port}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <Button size="sm">Open ↗</Button>
                    </a>
                  ) : (
                    <Button size="sm" onClick={() => navigate("/labs")}>Manage</Button>
                  )}
                </div>
                <div style={{ marginTop: 14, padding: "14px 4px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, borderTop: `1px solid ${t.rule}` }}>
                  {[
                    ["CPU", running && s ? `${s.cpu_percent}%` : "—", running && s ? s.cpu_percent : 0, t.blue],
                    ["Memory", running && s ? `${fmtBytes(s.mem_used)} / ${fmtBytes(s.mem_limit)}` : "—", running && s ? s.mem_percent : 0, t.purple],
                    ["Network", running ? fmtRate(live.netRate) : "—", running ? Math.min((live.netRate / NET_FULL) * 100, 100) : 0, t.cyan],
                  ].map(([k, v, val, c]) => (
                    <div key={k as string}>
                      <div style={{ fontSize: 12, color: t.muted }}>{k}</div>
                      <div style={{ fontFamily: t.mono, fontSize: 16, fontWeight: 600, marginTop: 4 }}>{v}</div>
                      <div style={{ marginTop: 6 }}><Progress value={val as number} color={c as string} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, padding: "20px 4px" }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>No lab deployed</div>
                <div style={{ color: t.muted, fontSize: 13 }}>Deploy a code-server container on your private network.</div>
                <Button primary onClick={() => navigate("/labs")}>+ Deploy your first lab</Button>
              </div>
            )}
          </Card>

          {/* derived activity */}
          <Card
            title="Activity"
            action={
              running ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: t.muted }}>
                  <span className="atmos-pulse" style={{ width: 6, height: 6, background: t.green, borderRadius: 999, boxShadow: `0 0 8px ${t.green}` }} />
                  Live
                </span>
              ) : undefined
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              {[
                lab ? ["lab", t.green, `Lab ${lab.status}`, `${lab.name} · ${lab.internal_ip}`] : ["lab", t.muted2, "No lab", "deploy one to get started"],
                ["peers", peers.length ? t.blue : t.muted2, `${peers.length} WireGuard ${peers.length === 1 ? "peer" : "peers"}`, peers[0] ? peers[0].device_name : "none yet"],
                ["db", dbs.length ? t.cyan : t.muted2, `${dbs.length} ${dbs.length === 1 ? "database" : "databases"}`, dbs[0] ? `${dbs[0].db_name} · ${dbs[0].engine}` : "none yet"],
              ].map(([k, c, h, sub], i) => (
                <div key={k as string} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingTop: i ? 12 : 0, borderTop: i ? `1px solid ${t.rule}` : "none" }}>
                  <div style={{ width: 8, height: 8, background: c as string, borderRadius: 999, marginTop: 5, boxShadow: `0 0 8px ${c}60`, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: t.text2 }}>{h}</div>
                    <div style={{ color: t.muted, fontSize: 12, marginTop: 2, fontFamily: t.mono }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* lower row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Card title="Peers" action={<Button size="sm" ghost onClick={() => navigate("/network")}>+ Add</Button>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              {peers.length === 0 && <div style={{ color: t.muted2, fontSize: 13 }}>No peers yet.</div>}
              {peers.slice(0, 4).map((p, i) => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12, paddingTop: i ? 10 : 0, borderTop: i ? `1px solid ${t.rule}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ width: 6, height: 6, background: p.latest_handshake ? t.green : t.muted2, borderRadius: 999, boxShadow: p.latest_handshake ? `0 0 8px ${t.green}` : "none", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.device_name}</div>
                      <div style={{ color: t.muted, fontSize: 12, fontFamily: t.mono, marginTop: 2 }}>{p.address}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: t.muted, fontFamily: t.mono }}>{p.latest_handshake ? "live" : "never"}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Databases" action={<Button size="sm" ghost onClick={() => navigate("/databases")}>+ New</Button>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              {dbs.length === 0 && <div style={{ color: t.muted2, fontSize: 13 }}>No databases yet.</div>}
              {dbs.slice(0, 4).map((d, i) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: i ? 10 : 0, borderTop: i ? `1px solid ${t.rule}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ width: 6, height: 6, background: t.green, borderRadius: 999, boxShadow: `0 0 8px ${t.green}` }} />
                    <span style={{ fontWeight: 500 }}>{d.db_name}</span>
                  </div>
                  <span style={{ fontSize: 12, color: t.muted, fontFamily: t.mono }}>{d.engine}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
