import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Page } from "../components/Page";
import { Nav } from "../components/Nav";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton, SkeletonRows } from "../components/Skeleton";
import { networkApi, type DomainList } from "../api/network";
import { quotaApi, type Quota } from "../api/quota";
import { ApiError } from "../api/client";
import type { PeerStatus } from "../api/types";

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KiB", "MiB", "GiB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`;
}

export function Network() {
  const t = useTheme();
  const input: React.CSSProperties = {
    flex: 1,
    background: t.bg2,
    border: `1px solid ${t.rule2}`,
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: t.mono,
    color: t.text,
    outline: "none",
  };
  const [peers, setPeers] = useState<PeerStatus[]>([]);
  const [selected, setSelected] = useState<PeerStatus | null>(null);
  const [config, setConfig] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainList | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [newDevice, setNewDevice] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, d, q] = await Promise.allSettled([
      networkApi.listPeers(),
      networkApi.listDomains(),
      quotaApi.get(),
    ]);
    if (p.status === "fulfilled") {
      setPeers(p.value);
      setSelected((cur) => cur ?? p.value[0] ?? null);
    }
    if (d.status === "fulfilled") setDomains(d.value);
    if (q.status === "fulfilled") setQuota(q.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setConfig(null);
      setQrUrl(null);
      return;
    }
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const [cfg, blob] = await Promise.all([
          networkApi.peerConfig(selected.id),
          networkApi.peerQrBlob(selected.id),
        ]);
        if (cancelled) return;
        setConfig(cfg);
        url = URL.createObjectURL(blob);
        setQrUrl(url);
      } catch {
        if (!cancelled) {
          setConfig(null);
          setQrUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [selected]);

  async function addPeer(e: FormEvent) {
    e.preventDefault();
    if (!newDevice.trim()) return;
    setBusy("peer");
    setError(null);
    try {
      const peer = await networkApi.createPeer(newDevice.trim());
      setNewDevice("");
      await load();
      setSelected(peer);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add peer");
    } finally {
      setBusy(null);
    }
  }

  async function removePeer(id: string) {
    if (!confirm("Revoke this peer? Its tunnel stops working immediately.")) return;
    setBusy("delpeer");
    setError(null);
    try {
      await networkApi.deletePeer(id);
      if (selected?.id === id) setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to revoke peer");
    } finally {
      setBusy(null);
    }
  }

  async function addDomain(e: FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setBusy("domain");
    setError(null);
    try {
      setDomains(await networkApi.addDomain(newDomain.trim()));
      setNewDomain("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add domain");
    } finally {
      setBusy(null);
    }
  }

  async function removeDomain(domain: string) {
    setBusy("deldomain");
    try {
      await networkApi.removeDomain(domain);
      setDomains(await networkApi.listDomains());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove domain");
    } finally {
      setBusy(null);
    }
  }

  function downloadConf() {
    if (!config || !selected) return;
    const blob = new Blob([config], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wg-${selected.device_name}.conf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page>
      <Nav />
      <div className="atmos-fade" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>Network</div>
        <div style={{ color: t.muted, fontSize: 14, marginTop: 4 }}>
          WireGuard peers and custom domains.
          {domains && <span style={{ color: t.muted2, fontFamily: t.mono }}> · {domains.auto_host}</span>}
        </div>

        {error && (
          <div style={{ marginTop: 18, padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.red}55`, background: `${t.red}14`, color: t.red, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 18, alignItems: "start" }}>
          {/* LEFT — peers + domains */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Card title={`Devices · ${peers.length}/${quota?.max_client_peers ?? "—"}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {loading ? (
                  <SkeletonRows rows={3} />
                ) : (
                  <>
                {peers.length === 0 && <div style={{ color: t.muted2, fontSize: 13 }}>No peers yet — add a device.</div>}
                {peers.map((p, i) => {
                  const on = selected?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      style={{
                        textAlign: "left",
                        background: on ? t.cardHi : "transparent",
                        border: `1px solid ${on ? t.rule2 : "transparent"}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginTop: i && !on ? 0 : 0,
                        cursor: "pointer",
                        color: t.text,
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: p.latest_handshake ? t.green : t.muted2, boxShadow: p.latest_handshake ? `0 0 8px ${t.green}` : "none" }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500 }}>{p.device_name}</div>
                          <div style={{ color: t.muted, fontSize: 12, fontFamily: t.mono, marginTop: 2 }}>{p.address}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: t.muted, fontFamily: t.mono }}>{p.latest_handshake ? "live" : "never"}</span>
                    </button>
                  );
                })}
                {quota && peers.length >= quota.max_client_peers ? (
                  <div style={{ fontSize: 12, color: t.muted2, marginTop: 4 }}>
                    Peer limit reached ({quota.max_client_peers}). Revoke one to add another.
                  </div>
                ) : (
                  <form onSubmit={addPeer} style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <input style={input} value={newDevice} onChange={(e) => setNewDevice(e.target.value)} placeholder="device name (e.g. macbook)" />
                    <Button primary type="submit" disabled={busy !== null}>
                      {busy === "peer" ? "Adding…" : "Add"}
                    </Button>
                  </form>
                )}
                  </>
                )}
              </div>
            </Card>

            <Card title={`Custom domains · ${domains?.domains.length ?? 0}/${quota?.max_domains ?? "—"}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {loading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Skeleton w="70%" h={14} />
                    <Skeleton w="55%" h={14} />
                  </div>
                ) : (
                  <>
                {(domains?.domains.length ?? 0) === 0 && <div style={{ color: t.muted2, fontSize: 13 }}>No custom domains.</div>}
                {domains?.domains.map((d, i) => (
                  <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: i ? 10 : 0, borderTop: i ? `1px solid ${t.rule}` : "none" }}>
                    <span style={{ fontSize: 14 }}>{d}</span>
                    <button onClick={() => void removeDomain(d)} disabled={busy !== null} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: t.red }}>
                      Remove
                    </button>
                  </div>
                ))}
                {quota && (domains?.domains.length ?? 0) >= quota.max_domains ? (
                  <div style={{ fontSize: 12, color: t.muted2, marginTop: 4 }}>
                    Domain limit reached ({quota.max_domains}).
                  </div>
                ) : (
                <form onSubmit={addDomain} style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <input style={input} value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="app.example.com" />
                  <Button type="submit" disabled={busy !== null}>
                    {busy === "domain" ? "Adding…" : "Add"}
                  </Button>
                </form>
                )}
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT — selected peer */}
          <Card title={selected ? `Peer · ${selected.device_name}` : "Peer"} action={selected && <Badge tone={selected.latest_handshake ? "green" : "muted"}>{selected.latest_handshake ? "active" : "idle"}</Badge>}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <Skeleton w={200} h={200} r={10} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <Skeleton w="90%" h={12} />
                    <Skeleton w="80%" h={12} />
                    <Skeleton w="100%" h={36} r={6} style={{ marginTop: 6 }} />
                    <Skeleton w="100%" h={36} r={6} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12 }}>
                      <Skeleton w={80} h={12} />
                      <Skeleton w="75%" h={12} />
                    </div>
                  ))}
                </div>
              </div>
            ) : !selected ? (
              <div style={{ color: t.muted2, fontSize: 13 }}>Select a device to see its QR + config.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ background: "#fff", borderRadius: 10, padding: 10, lineHeight: 0 }}>
                    {qrUrl ? (
                      <img src={qrUrl} alt="WireGuard QR" width={180} height={180} style={{ display: "block" }} />
                    ) : (
                      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12, fontFamily: t.mono }}>
                        loading…
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: t.muted, lineHeight: 1.6 }}>
                    Open WireGuard → Add Tunnel → Scan QR.
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                      <Button onClick={downloadConf} disabled={!config}>Download .conf</Button>
                      <Button danger disabled={busy !== null} onClick={() => void removePeer(selected.id)}>
                        {busy === "delpeer" ? "Revoking…" : "Revoke peer"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {[
                    ["Public key", selected.public_key],
                    ["Address", `${selected.address}/32`],
                    ["Endpoint", selected.endpoint ?? "—"],
                    ["Transfer", `↑ ${fmtBytes(selected.tx_bytes)}  ↓ ${fmtBytes(selected.rx_bytes)}`],
                  ].map(([k, v], i) => (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, padding: "8px 0", borderTop: i ? `1px solid ${t.rule}` : "none" }}>
                      <span style={{ fontSize: 12, color: t.muted }}>{k}</span>
                      <span style={{ fontSize: 12, fontFamily: t.mono, wordBreak: "break-all" }}>{v}</span>
                    </div>
                  ))}
                </div>

                {config && (
                  <pre style={{ margin: 0, padding: 14, background: t.bg2, border: `1px solid ${t.rule}`, borderRadius: 8, fontFamily: t.mono, fontSize: 11.5, lineHeight: 1.6, color: t.muted, overflow: "auto" }}>
                    {config}
                  </pre>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
