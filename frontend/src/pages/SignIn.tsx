import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { t } from "../theme/atmos";
import { AuthShell } from "../components/AuthShell";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

export function SignIn() {
  const { signin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/readyz")
      .then((r) => r.json())
      .then((d) => setReady(Boolean(d.status)))
      .catch(() => setReady(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signin(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      footerRight={
        <span>
          status:{" "}
          {ready === null ? (
            <span style={{ color: t.muted }}>checking…</span>
          ) : ready ? (
            <span style={{ color: t.green }}>all systems operational</span>
          ) : (
            <span style={{ color: t.amber }}>degraded</span>
          )}
        </span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>Welcome back</div>
          <div style={{ color: t.muted, fontSize: 14, marginTop: 6 }}>
            Sign in to your private compute workspace.
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${t.red}55`,
                background: `${t.red}14`,
                color: t.red,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <Button primary size="lg" type="submit" disabled={busy} style={{ marginTop: 2, width: "100%" }}>
            {busy ? "Signing in…" : "Sign in →"}
          </Button>
        </form>

        <div style={{ textAlign: "center", fontSize: 13, color: t.muted2 }}>
          <span style={{ color: t.muted }}>Need an account? </span>
          <Link to="/auth/signup" style={{ color: t.text, textDecoration: "none", fontWeight: 500 }}>
            Create one
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
