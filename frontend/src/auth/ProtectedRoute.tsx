import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { GlobalLoader } from "../components/GlobalLoader";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <GlobalLoader label="Authenticating" />;
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
