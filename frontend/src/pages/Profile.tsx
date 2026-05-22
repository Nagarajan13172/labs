import { useState, type FormEvent } from "react";
import { gradient } from "../theme/atmos";
import { useTheme } from "../theme/ThemeContext";
import { Page } from "../components/Page";
import { Nav } from "../components/Nav";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { useAuth } from "../auth/AuthContext";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";

export function Profile() {
  const t = useTheme();
  const { user, refreshUser, signout } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = phone.trim() !== (user?.phone ?? "");

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await authApi.updateProfile(phone.trim());
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setBusy(false);
    }
  }

  const readonly: React.CSSProperties = {
    padding: "11px 14px",
    background: t.bg2,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    fontSize: 14,
    color: t.muted,
    fontFamily: t.mono,
  };

  return (
    <Page>
      <Nav />
      <div
        className="atmos-fade"
        style={{ maxWidth: 760, margin: "0 auto", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24 }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background: gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 600,
              color: "#fff",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            {(user?.username ?? "?").charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}>{user?.username}</div>
            <div style={{ color: t.muted, fontSize: 14, marginTop: 2 }}>{user?.email}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Badge tone="blue">{user?.role}</Badge>
              <Badge tone={user?.is_verified ? "green" : "amber"}>
                {user?.is_verified ? "verified" : "unverified"}
              </Badge>
            </div>
          </div>
        </div>

        {/* account details (read-only) */}
        <Card title="Account">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: t.muted, fontWeight: 500, marginBottom: 6 }}>Email</div>
              <div style={readonly}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: t.muted, fontWeight: 500, marginBottom: 6 }}>Username</div>
              <div style={readonly}>{user?.username}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: t.muted, fontWeight: 500, marginBottom: 6 }}>Role</div>
              <div style={{ ...readonly, textTransform: "capitalize" }}>{user?.role}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: t.muted, fontWeight: 500, marginBottom: 6 }}>Member since</div>
              <div style={readonly}>
                {user ? new Date(user.created_at).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>
        </Card>

        {/* editable */}
        <Card title="Edit profile">
          <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field
              label="Phone"
              type="tel"
              autoComplete="tel"
              placeholder="10 digits"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSaved(false);
              }}
            />
            <div style={{ fontSize: 12, color: t.muted2, fontFamily: t.mono }}>
              Email and username can't be changed.
            </div>

            {error && (
              <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.red}55`, background: `${t.red}14`, color: t.red, fontSize: 13 }}>
                {error}
              </div>
            )}
            {saved && !dirty && (
              <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.green}55`, background: `${t.green}14`, color: t.green, fontSize: 13 }}>
                Profile updated.
              </div>
            )}

            <div>
              <Button primary type="submit" disabled={busy || !dirty}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>

        {/* security / session */}
        <Card title="Security">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ color: t.muted, fontSize: 13, lineHeight: 1.6, maxWidth: 460 }}>
              Passwords are changed via the email reset flow. Signing out revokes this device's
              refresh token.
            </div>
            <Button danger onClick={() => void signout()}>
              Log out
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}
