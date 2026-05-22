import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Page } from "../components/Page";
import { Nav } from "../components/Nav";
import { Card } from "../components/Card";
import { Badge, type Tone } from "../components/Badge";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";
import { useMqttJobs, type JobMessage, type MqttState } from "../hooks/useMqttJobs";
import { jobsApi } from "../api/jobs";
import { ApiError } from "../api/client";

const STATE_META: Record<MqttState, { tone: Tone; label: string }> = {
  connected: { tone: "green", label: "Live" },
  connecting: { tone: "amber", label: "Connecting…" },
  offline: { tone: "muted", label: "Offline" },
  error: { tone: "red", label: "Error" },
};

export function Jobs() {
  const t = useTheme();
  const { user } = useAuth();
  const { messages, state, clear } = useMqttJobs(user?.username);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lineTone = (m: JobMessage): string =>
    m.is_error ? t.red : m.is_finished ? t.green : m.status ? t.blue : t.muted;

  async function runSample() {
    setBusy(true);
    setError(null);
    try {
      await jobsApi.runSample(); // progress streams in live over MQTT
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to enqueue job");
    } finally {
      setBusy(false);
    }
  }

  const meta = STATE_META[state];

  return (
    <Page>
      <Nav />
      <div className="atmos-fade" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>Jobs</div>
            <div style={{ color: t.muted, fontSize: 14, marginTop: 4 }}>
              Real-time activity streamed over MQTT — lab deploys and background tasks appear here as
              they happen.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Badge tone={meta.tone}>
              <span className={state === "connected" ? "atmos-pulse" : undefined} style={{ display: "contents" }}>
                {meta.label}
              </span>
            </Badge>
            <Button disabled={busy} onClick={() => void runSample()}>
              {busy ? "Enqueuing…" : "▸ Run sample job"}
            </Button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 18, padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.red}55`, background: `${t.red}14`, color: t.red, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 22 }}>
          <Card
            title="Live activity"
            action={
              <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: t.muted, fontFamily: t.mono }}>
                  {messages.length} {messages.length === 1 ? "event" : "events"}
                </span>
                {messages.length > 0 && (
                  <button onClick={clear} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: t.muted }}>
                    Clear
                  </button>
                )}
              </span>
            }
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: 18, fontFamily: t.mono, fontSize: 13, lineHeight: 1.9, minHeight: 280, maxHeight: 460, overflowY: "auto" }}>
              {messages.length === 0 ? (
                <div style={{ color: t.muted2 }}>
                  {state === "connected"
                    ? "Waiting for activity — run a job or deploy a lab to see live progress."
                    : state === "connecting"
                      ? "Connecting to the live stream…"
                      : "Live stream offline. Is the backend (RabbitMQ web-MQTT) running?"}
                </div>
              ) : (
                messages.map((m, i) => {
                  const latest = i === messages.length - 1;
                  const color = lineTone(m);
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "88px 16px 1fr", columnGap: 12, alignItems: "baseline" }}>
                      <span style={{ color: t.muted2 }}>{m.ts}</span>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: color,
                          boxShadow: `0 0 8px ${color}80`,
                          alignSelf: "center",
                        }}
                      />
                      <span
                        style={{
                          color: m.is_error ? t.red : t.text,
                          fontWeight: latest ? 600 : 400,
                          wordBreak: "break-word",
                        }}
                      >
                        {m.message}
                        {m.is_finished && !m.is_error && (
                          <span style={{ color: t.green, marginLeft: 8, fontSize: 11 }}>● done</span>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <div style={{ marginTop: 12, fontSize: 12, color: t.muted2, fontFamily: t.mono }}>
            subscribed to mqtt://…/topic/{user?.username} · RabbitMQ web-MQTT
          </div>
        </div>
      </div>
    </Page>
  );
}
