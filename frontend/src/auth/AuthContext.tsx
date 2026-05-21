import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authApi } from "../api/auth";
import { tokens, LOGOUT_EVENT } from "../api/tokens";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokens.access) {
      setUser(null);
      return;
    }
    try {
      setUser(await authApi.me());
    } catch {
      setUser(null);
    }
  }, []);

  // Bootstrap: if we have a token, resolve the current user.
  useEffect(() => {
    (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  // The API client signals here when a refresh fails — drop the session.
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener(LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(LOGOUT_EVENT, onLogout);
  }, []);

  const signin = useCallback(async (email: string, password: string) => {
    const pair = await authApi.signin(email, password);
    tokens.set(pair.access_token, pair.refresh_token);
    setUser(await authApi.me());
  }, []);

  const signout = useCallback(async () => {
    const refresh = tokens.refresh;
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        /* best-effort */
      }
    }
    tokens.clear();
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, signin, signout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
