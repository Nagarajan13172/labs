import { useRef, useState } from "react";
import { t } from "../theme/atmos";
import { Page } from "../components/Page";
import { Nav } from "../components/Nav";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { jobsApi } from "../api/jobs";
import { ApiError } from "../api/client";

interface LogLine {
  ts: string;
  msg: string;
  detail: string;
  tone: "green" | "blue" | "amber" | "red" | "muted";
}

const now = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
const dot = { green: t.green, blue: t.blue, amber: t.amber, red: t.red, muted: t.muted2 };

export function Jobs() {
  const [log, setLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);

  const push = (line: LogLine) => setLog((l) => [...l, line]);

  async function runSample() {
    if (active.current) return;
    active.current = true;
    setRunning(true);
    setError(null);
    push({ ts: now(), msg: "task.enqueue", detail: "sample.long_task", tone: "muted" });
    try {
      const { task_id, topic } = await jobsApi.runSample();
      push({ ts: now(), msg: "task.accepted", detail: `${task_id.slice(0, 8)} · ${topic}`, tone: "blue" });
      let last = "";
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const s = await jobsApi.status(task_id);
        if (s.state !== last) {
          last = s.state;
          const tone = s.state === "SUCCESS" ? "green" : s.state === "FAILURE" ? "red" : "amber";
          push({ ts: now(), msg: `state.${s.state.toLowerCase()}`, detail: "", tone });
        }
        if (s.state === "SUCCESS") {
          push({ ts: now(), msg: "task.done", detail: JSON.stringify(s.result), tone: "green" });
          break;
        }
        if (s.state === "FAILURE") {
          push({ ts: now(), msg: "task.failed", detail: String(s.result), tone: "red" });
          break;
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Job failed");
    } finally {
      active.current = false;
      setRunning(false);
    }
  }

  return (
    <Page>
      <Nav />
      <div className="atmos-fade" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>Jobs</div>
            <div style={{ color: t.muted, fontSize: 14, marginTop: 4 }}>
              Background tasks run on Celery and stream progress over MQTT.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Badge tone={running ? "amber" : "green"}>{running ? "running" : "idle"}</Badge>
            <Button primary disabled={running} onClick={() => void runSample()}>
              {running ? "Running…" : "▸ Run sample job"}
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
            title="Task stream"
            action={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: t.muted }}>
                <span className="atmos-pulse" style={{ width: 6, height: 6, background: t.green, borderRadius: 999, boxShadow: `0 0 8px ${t.green}` }} />
                polled · MQTT live = follow-up
              </span>
            }
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: 18, fontFamily: t.mono, fontSize: 13, lineHeight: 1.9, minHeight: 240 }}>
              {log.length === 0 ? (
                <span style={{ color: t.muted2 }}>No jobs yet — run the sample task to watch it stream through Celery.</span>
              ) : (
                log.map((l, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "88px 16px 220px 1fr", columnGap: 12, alignItems: "baseline" }}>
                    <span style={{ color: t.muted2 }}>{l.ts}</span>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: dot[l.tone], boxShadow: `0 0 8px ${dot[l.tone]}80`, alignSelf: "center" }} />
                    <span style={{ color: t.text2, fontWeight: 500 }}>{l.msg}</span>
                    <span style={{ color: t.muted, wordBreak: "break-all" }}>{l.detail}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
