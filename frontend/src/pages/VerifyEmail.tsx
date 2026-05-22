import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTheme } from "../theme/ThemeContext";
import { AuthShell } from "../components/AuthShell";
import { Button } from "../components/Button";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";

type State = "verifying" | "ok" | "error";

export function VerifyEmail() {
  const t = useTheme();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard StrictMode double-invoke (token is one-time)
    ran.current = true;
    if (!token) {
      setState("error");
      setMessage("Missing verification token.");
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setState("ok"))
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.message : "Verification failed.");
      });
  }, [token]);

  const dot =
    state === "ok" ? t.green : state === "error" ? t.red : t.blue;

  return (
    <AuthShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, textAlign: "center" }}>
        <span
          className={state === "verifying" ? "atmos-pulse" : undefined}
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: dot,
            boxShadow: `0 0 12px ${dot}`,
            alignSelf: "center",
          }}
        />
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>
          {state === "verifying" && "Verifying your email…"}
          {state === "ok" && "Email verified"}
          {state === "error" && "Verification failed"}
        </div>
        <div style={{ color: t.muted, fontSize: 14, lineHeight: 1.5 }}>
          {state === "verifying" && "Confirming your one-time token."}
          {state === "ok" && "Your account is active. You can sign in now."}
          {state === "error" && message}
        </div>
        {state !== "verifying" && (
          <Link to="/auth/signin" style={{ textDecoration: "none" }}>
            <Button primary size="lg" style={{ width: "100%" }}>
              {state === "ok" ? "Sign in →" : "Back to sign in"}
            </Button>
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
