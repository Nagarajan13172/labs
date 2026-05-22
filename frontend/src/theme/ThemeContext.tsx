// Theme provider: resolves the active palette (light/dark/system), persists the
// user's preference, mirrors the palette onto :root CSS variables (so the global
// stylesheet — body, scrollbars, placeholders — follows the theme), and exposes
// it to components via `useTheme()` / `useThemeMode()`.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { darkTheme, themes, type Theme, type ThemeName } from "./atmos";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "ys_theme";

interface ThemeState {
  theme: Theme; // active palette object
  mode: ThemeMode; // user preference (may be "system")
  resolved: ThemeName; // concretely applied palette
  setMode: (mode: ThemeMode) => void;
  toggle: () => void; // flip light <-> dark (sets an explicit mode)
}

const ThemeCtx = createContext<ThemeState | undefined>(undefined);

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* localStorage unavailable */
  }
  return "dark"; // dark-first product default
}

// CSS-var names mirror the dark defaults declared in index.css.
const CSS_VARS: Record<string, keyof Theme> = {
  "--bg": "bg",
  "--bg2": "bg2",
  "--card": "card",
  "--card-hi": "cardHi",
  "--rule": "rule",
  "--rule2": "rule2",
  "--text": "text",
  "--text2": "text2",
  "--muted": "muted",
  "--muted2": "muted2",
  "--blue": "blue",
  "--blue-hi": "blueHi",
  "--green": "green",
  "--amber": "amber",
  "--red": "red",
  "--purple": "purple",
};

function applyTheme(theme: Theme, resolved: ThemeName): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [cssVar, key] of Object.entries(CSS_VARS)) {
    root.style.setProperty(cssVar, theme[key]);
  }
  root.style.colorScheme = resolved; // native controls (selects, scrollbars)
  root.dataset.theme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  // Track OS-level scheme changes while in "system" mode.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mql.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const resolved: ThemeName = mode === "system" ? (systemDark ? "dark" : "light") : mode;
  const theme = themes[resolved];

  useEffect(() => {
    applyTheme(theme, resolved);
  }, [theme, resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  const value = useMemo<ThemeState>(
    () => ({ theme, mode, resolved, setMode, toggle }),
    [theme, mode, resolved, setMode, toggle],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

// Active palette. Falls back to the dark palette when no provider is mounted
// (keeps unit tests, which render components in isolation, deterministic).
export function useTheme(): Theme {
  return useContext(ThemeCtx)?.theme ?? darkTheme;
}

// Mode controls. Safe no-op fallback when used outside a provider.
export function useThemeMode(): Omit<ThemeState, "theme"> {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    return { mode: "dark", resolved: "dark", setMode: () => {}, toggle: () => {} };
  }
  const { mode, resolved, setMode, toggle } = ctx;
  return { mode, resolved, setMode, toggle };
}
