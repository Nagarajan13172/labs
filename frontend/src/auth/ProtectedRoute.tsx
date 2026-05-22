import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useTheme } from "../theme/ThemeContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const t = useTheme();

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: t.bg,
          fontFamily: t.mono,
          fontSize: 13,
          color: t.muted,
        }}
      >
        <span className="atmos-pulse">Authenticating…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
