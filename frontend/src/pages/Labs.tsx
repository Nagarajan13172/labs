import { useCallback, useEffect, useRef, useState } from "react";
import { gradient } from "../theme/atmos";
import { useTheme } from "../theme/ThemeContext";
import { Page } from "../components/Page";
import { Nav } from "../components/Nav";
import { Card } from "../components/Card";
import { Badge, type Tone } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { useAuth } from "../auth/AuthContext";
import { labsApi } from "../api/labs";
import { ApiError } from "../api/client";
import type { Lab, LabCredentials } from "../api/types";

const tone = (s: Lab["status"]): Tone =>
  s === "running" ? "green" : s === "failed" ? "red" : s === "stopped" ? "muted" : "amber";

export function Labs() {
  const t = useTheme();
  const codeBox: React.CSSProperties = {
    padding: 10,
    background: t.bg2,
    borderRadius: 6,
    border: `1px solid ${t.rule}`,
    fontFamily: t.mono,
    fontSize: 12,
    wordBreak: "break-all",
  };
  const { user } = useAuth();
  const [lab, setLab] = useState<Lab | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<LabCredentials | null>(null);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLab(await labsApi.get());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load lab");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [load]);

  useEffect(() => {
    if (lab && (lab.status === "pending" || lab.status === "provisioning")) {
      timer.current = window.setTimeout(() => void load(), 2500);
    }
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [lab, load]);

  async function run(action: string, fn: () => Promise<unknown>, after?: () => void) {
    setBusy(action);
    setError(null);
    try {
      await fn();
      await load();
      after?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `${action} failed`);
    } finally {
      setBusy(null);
    }
  }

  const running = lab?.status === "running";
  const autoHost = `${user?.username ?? "you"}.lab.localhost`;

  return (
    <Page>
      <Nav />
      <div className="atmos-fade" style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 28px" }}>
        {/* header */}
        <div style={{ fontSize: 13, color: t.muted, marginBottom: 8 }}>
          <span style={{ color: t.muted2 }}>~ /</span> {user?.username} <span style={{ color: t.muted2 }}>/</span>{" "}
          <span style={{ color: t.text }}>labs</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.mono, fontSize: 16, color: "#fff" }}>
              cs
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {loading ? (
                  <Skeleton w={150} h={24} r={6} />
                ) : (
                  <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>{lab ? lab.name : "No lab"}</span>
                )}
                {lab && <Badge tone={tone(lab.status)}>{lab.status}</Badge>}
              </div>
              <div style={{ color: t.muted, fontSize: 13, marginTop: 6, fontFamily: t.mono }}>
                {loading ? (
                  <Skeleton w={200} h={12} />
                ) : lab ? (
                  `${lab.image || "code-server"} · ${lab.internal_ip}`
                ) : (
                  "deploy a code-server container on your private network"
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!loading && !lab && (
              <Button primary disabled={busy !== null} onClick={() => void run("deploy", labsApi.deploy)}>
                {busy === "deploy" ? "Deploying…" : "+ Deploy lab"}
              </Button>
            )}
            {lab && (
              <Button disabled={busy !== null} onClick={() => void run("redeploy", labsApi.deploy)}>
                {busy === "redeploy" ? "Redeploying…" : "Redeploy"}
              </Button>
            )}
            {running && (
              <Button disabled={busy !== null} onClick={() => void run("stop", labsApi.stop)}>
                {busy === "stop" ? "Stopping…" : "Stop"}
              </Button>
            )}
            {lab?.status === "stopped" && (
              <Button disabled={busy !== null} onClick={() => void run("start", labsApi.start)}>
                {busy === "start" ? "Starting…" : "Start"}
              </Button>
            )}
            {lab && (
              <Button
                danger
                disabled={busy !== null}
                onClick={() => {
                  if (confirm("Destroy this lab? The container and its volume are removed.")) {
                    void run("destroy", labsApi.destroy, () => setCreds(null));
                  }
                }}
              >
                {busy === "destroy" ? "Destroying…" : "Destroy"}
              </Button>
            )}
            {running && lab?.host_port && (
              <a href={`http://localhost:${lab.host_port}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <Button primary>Open ↗</Button>
              </a>
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 18, padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.red}55`, background: `${t.red}14`, color: t.red, fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
            <Card title="Connection">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <Skeleton w={100} h={12} style={{ marginBottom: 8 }} />
                    <Skeleton w="100%" h={38} r={6} />
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Status">
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${t.rule}` : "none" }}>
                    <Skeleton w={70} h={13} />
                    <Skeleton w={120} h={13} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {!lab && !loading && (
          <Card style={{ marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, padding: "20px 4px" }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Nothing deployed yet</div>
              <div style={{ color: t.muted, fontSize: 13 }}>
                Deploy a code-server lab — it provisions on your private network and streams progress here.
              </div>
              <Button primary disabled={busy !== null} onClick={() => void run("deploy", labsApi.deploy)}>
                {busy === "deploy" ? "Deploying…" : "+ Deploy lab"}
              </Button>
            </div>
          </Card>
        )}

        {lab && (
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
            {/* connection */}
            <Card title="Connection">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: t.muted, marginBottom: 6 }}>Auto host</div>
                  <div style={{ ...codeBox, color: t.blueHi }}>https://{autoHost}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: t.muted, marginBottom: 6 }}>Code-server URL</div>
                  <div style={{ ...codeBox, color: t.text }}>
                    {lab.host_port ? `http://localhost:${lab.host_port}` : "— (not running)"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: t.muted, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                    <span>Password</span>
                    <span style={{ display: "flex", gap: 12 }}>
                      <span
                        style={{ color: t.muted, cursor: "pointer" }}
                        onClick={() => void run("creds", async () => setCreds(await labsApi.credentials()))}
                      >
                        {busy === "creds" ? "…" : creds ? "Refresh" : "Reveal"}
                      </span>
                      {creds && (
                        <span style={{ color: t.muted, cursor: "pointer" }} onClick={() => void navigator.clipboard.writeText(creds.code_server_password)}>
                          Copy
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ ...codeBox, fontSize: 14, letterSpacing: creds ? 0 : 2 }}>
                    {creds ? creds.code_server_password : "••••••••••••••••"}
                  </div>
                </div>
              </div>
            </Card>

            {/* status */}
            <Card title="Status" action={lab.status === "provisioning" || lab.status === "pending" ? <Badge tone="amber">provisioning</Badge> : <Badge tone={tone(lab.status)}>{lab.status}</Badge>}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["State", lab.status],
                  ["Image", lab.image || "—"],
                  ["Internal IP", lab.internal_ip],
                  ["Host port", lab.host_port ? String(lab.host_port) : "—"],
                  ["Created", new Date(lab.created_at).toLocaleString()],
                  ["Updated", new Date(lab.updated_at).toLocaleString()],
                ].map(([k, v], i) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${t.rule}` : "none" }}>
                    <span style={{ fontSize: 13, color: t.muted }}>{k}</span>
                    <span style={{ fontSize: 13, fontFamily: t.mono, color: t.text, textAlign: "right", wordBreak: "break-all" }}>{v}</span>
                  </div>
                ))}
                {(lab.status === "pending" || lab.status === "provisioning") && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontFamily: t.mono, fontSize: 12, color: t.muted }}>
                    <span className="atmos-pulse" style={{ width: 7, height: 7, background: t.amber, borderRadius: 999, boxShadow: `0 0 8px ${t.amber}` }} />
                    provisioning… polling every 2.5s
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Page>
  );
}
