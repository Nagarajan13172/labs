import { useCallback, useEffect, useState, type FormEvent } from "react";
import { t } from "../theme/atmos";
import { Page } from "../components/Page";
import { Nav } from "../components/Nav";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { servicesApi, type EngineInfo } from "../api/services";
import { ApiError } from "../api/client";
import type { DatabaseEngine, ManagedDatabase } from "../api/types";

const fieldStyle: React.CSSProperties = {
  background: t.bg2,
  border: `1px solid ${t.rule2}`,
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  color: t.text,
  outline: "none",
};

export function Databases() {
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [dbs, setDbs] = useState<ManagedDatabase[]>([]);
  const [selected, setSelected] = useState<ManagedDatabase | null>(null);
  const [reveal, setReveal] = useState(false);
  const [engine, setEngine] = useState<DatabaseEngine>("mysql");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [e, d] = await Promise.allSettled([servicesApi.listEngines(), servicesApi.listDatabases()]);
    if (e.status === "fulfilled") {
      setEngines(e.value);
      if (e.value[0]) setEngine(e.value[0].engine as DatabaseEngine);
    }
    if (d.status === "fulfilled") {
      setDbs(d.value);
      setSelected((cur) => cur ?? d.value[0] ?? null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy("create");
    setError(null);
    try {
      const db = await servicesApi.createDatabase(engine, name.trim());
      setName("");
      await load();
      setSelected(db);
      setReveal(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create database");
    } finally {
      setBusy(null);
    }
  }

  async function drop(db: ManagedDatabase) {
    if (!confirm(`Drop ${db.db_name}? The database and its user are removed.`)) return;
    setBusy("drop");
    setError(null);
    try {
      await servicesApi.deleteDatabase(db.id);
      if (selected?.id === db.id) {
        setSelected(null);
        setReveal(false);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to drop database");
    } finally {
      setBusy(null);
    }
  }

  const maskedUri = (db: ManagedDatabase) =>
    reveal ? db.connection_uri : db.connection_uri.replace(db.password, "•••••••");

  return (
    <Page>
      <Nav />
      <div className="atmos-fade" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>Databases</div>
            <div style={{ color: t.muted, fontSize: 14, marginTop: 4 }}>
              Managed MySQL, MariaDB, and MongoDB — isolated database + scoped user per instance.
            </div>
          </div>
          <form onSubmit={create} style={{ display: "flex", gap: 8 }}>
            <select value={engine} onChange={(e) => setEngine(e.target.value as DatabaseEngine)} style={{ ...fieldStyle, textTransform: "capitalize", cursor: "pointer" }}>
              {engines.map((e) => (
                <option key={e.engine} value={e.engine}>
                  {e.engine}
                </option>
              ))}
            </select>
            <input style={{ ...fieldStyle, fontFamily: t.mono }} value={name} onChange={(e) => setName(e.target.value)} placeholder="name (e.g. shop)" />
            <Button primary type="submit" disabled={busy !== null || engines.length === 0}>
              {busy === "create" ? "Creating…" : "+ New database"}
            </Button>
          </form>
        </div>

        {/* engines */}
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: `repeat(${Math.max(engines.length, 1)}, 1fr)`, gap: 14 }}>
          {engines.map((e) => (
            <div key={e.engine} style={{ background: e.engine === engine ? t.cardHi : t.card, border: `1px solid ${e.engine === engine ? t.rule2 : t.rule}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: t.green, boxShadow: `0 0 8px ${t.green}` }} />
                <div style={{ fontSize: 16, fontWeight: 600, textTransform: "capitalize" }}>{e.engine}</div>
              </div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 6, fontFamily: t.mono }}>
                {e.host}:{e.port}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 18, padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.red}55`, background: `${t.red}14`, color: t.red, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, alignItems: "start" }}>
          {/* table */}
          <Card title={`Your databases · ${dbs.length}`} padded={false}>
            {dbs.length === 0 ? (
              <div style={{ padding: 18, color: t.muted2, fontSize: 13 }}>No databases — create one above.</div>
            ) : (
              dbs.map((d, i) => {
                const on = selected?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelected(d);
                      setReveal(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 18px",
                      background: on ? t.cardHi : "transparent",
                      color: t.text,
                      border: "none",
                      borderTop: i ? `1px solid ${t.rule}` : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>{d.db_name}</div>
                      <div style={{ fontSize: 12, color: t.muted, fontFamily: t.mono, marginTop: 2 }}>user · {d.username}</div>
                    </div>
                    <span style={{ fontSize: 12, color: t.muted, textTransform: "capitalize" }}>{d.engine}</span>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: t.green, boxShadow: `0 0 8px ${t.green}` }} />
                  </button>
                );
              })
            )}
          </Card>

          {/* detail */}
          <Card title={selected ? `Detail · ${selected.db_name}` : "Detail"} action={selected && <Badge tone="green">online</Badge>}>
            {!selected ? (
              <div style={{ color: t.muted2, fontSize: 13 }}>Select a database to see its connection details.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: t.muted, marginBottom: 6 }}>Connection URI</div>
                  <div style={{ padding: 10, background: t.bg2, borderRadius: 6, border: `1px solid ${t.rule}`, fontFamily: t.mono, fontSize: 12, color: t.blueHi, wordBreak: "break-all", lineHeight: 1.5 }}>
                    {maskedUri(selected)}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Button size="sm" onClick={() => void navigator.clipboard.writeText(selected.connection_uri)}>Copy URI</Button>
                    <Button size="sm" ghost onClick={() => setReveal((r) => !r)}>{reveal ? "Hide password" : "Reveal password"}</Button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {[
                    ["Host", `${selected.host}:${selected.port}`],
                    ["Database", selected.db_name],
                    ["Username", selected.username],
                    ["Password", reveal ? selected.password : "••••••••"],
                    ["Created", new Date(selected.created_at).toLocaleString()],
                  ].map(([k, v], i) => (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12, padding: "8px 0", borderTop: i ? `1px solid ${t.rule}` : "none" }}>
                      <span style={{ fontSize: 12, color: t.muted }}>{k}</span>
                      <span style={{ fontSize: 12, fontFamily: t.mono, wordBreak: "break-all" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <Button danger disabled={busy !== null} onClick={() => void drop(selected)}>
                  {busy === "drop" ? "Dropping…" : "Drop database"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
