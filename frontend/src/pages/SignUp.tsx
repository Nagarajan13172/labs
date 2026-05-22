import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../theme/ThemeContext";
import { AuthShell } from "../components/AuthShell";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";

export function SignUp() {
  const t = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authApi.signup({ email: email.trim(), password, phone: phone.trim() });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>Check your email</div>
          <div style={{ color: t.muted, fontSize: 14, lineHeight: 1.5 }}>
            We sent a verification link to <span style={{ color: t.text }}>{email}</span>. Click it to
            activate your account, then sign in.
          </div>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${t.rule2}`,
              background: t.bg2,
              fontFamily: t.mono,
              fontSize: 12.5,
              color: t.muted,
              textAlign: "left",
            }}
          >
            dev · open MailHog at{" "}
            <a href="http://localhost:8025" target="_blank" rel="noreferrer" style={{ color: t.blueHi }}>
              localhost:8025
            </a>{" "}
            to grab the link
          </div>
          <Link to="/auth/signin" style={{ textDecoration: "none" }}>
            <Button primary size="lg" style={{ width: "100%" }}>
              Back to sign in
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>Create your account</div>
          <div style={{ color: t.muted, fontSize: 14, marginTop: 6 }}>
            Spin up private compute in minutes.
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
            autoComplete="new-password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Field
            label="Phone"
            type="tel"
            autoComplete="tel"
            required
            placeholder="10 digits"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div style={{ fontSize: 12, color: t.muted2, lineHeight: 1.6, fontFamily: t.mono }}>
            8–64 chars · upper + lower + digit + special
            <br />
            domains: gmail, outlook, hotmail, icloud, protonmail, live
          </div>

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

          <Button primary size="lg" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Creating…" : "Create account →"}
          </Button>
        </form>

        <div style={{ textAlign: "center", fontSize: 13, color: t.muted2 }}>
          <span style={{ color: t.muted }}>Already have an account? </span>
          <Link to="/auth/signin" style={{ color: t.text, textDecoration: "none", fontWeight: 500 }}>
            Sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
