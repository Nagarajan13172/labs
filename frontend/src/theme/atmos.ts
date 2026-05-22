// ATMOS design tokens — light + dark palettes sharing the same key set.
//
// Components read the *active* palette via `useTheme()` (see theme/ThemeContext).
// `t` below is the dark palette and serves two purposes: it is the default
// returned by `useTheme()` when no ThemeProvider is mounted (e.g. in unit tests),
// and it keeps the original import path (`import { t } from "../theme/atmos"`)
// working for tests that assert against concrete colours.

export interface Theme {
  bg: string;
  bg2: string;
  card: string;
  cardHi: string;
  rule: string;
  rule2: string;
  text: string;
  text2: string;
  muted: string;
  muted2: string;
  blue: string;
  blueHi: string;
  green: string;
  amber: string;
  red: string;
  purple: string;
  pink: string;
  cyan: string;
  sans: string;
  mono: string;
}

export type ThemeName = "dark" | "light";

const fonts = {
  sans: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
} as const;

// V4 · ATMOS — warm-black surfaces, hairline borders, electric accents.
export const darkTheme: Theme = {
  bg: "#0a0a0a",
  bg2: "#0f0f0f",
  card: "#111111",
  cardHi: "#161616",
  rule: "#1f1f1f",
  rule2: "#2a2a2a",
  text: "#ededed",
  text2: "#fafafa",
  muted: "#8a8a8a",
  muted2: "#5f5f5f",
  blue: "#3b82f6",
  blueHi: "#60a5fa",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#a855f7",
  pink: "#ec4899",
  cyan: "#06b6d4",
  ...fonts,
};

// Light counterpart — soft off-white surfaces, the same accent family tuned a
// shade darker so it stays legible on light backgrounds.
export const lightTheme: Theme = {
  bg: "#fbfbfc",
  bg2: "#f3f3f5",
  card: "#ffffff",
  cardHi: "#f0f0f2",
  rule: "#e6e6e9",
  rule2: "#d4d4d9",
  text: "#1c1c1e",
  text2: "#0a0a0b",
  muted: "#6c6c74",
  muted2: "#9b9ba3",
  blue: "#2563eb",
  blueHi: "#3b82f6",
  green: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  purple: "#9333ea",
  pink: "#db2777",
  cyan: "#0891b2",
  ...fonts,
};

export const themes: Record<ThemeName, Theme> = {
  dark: darkTheme,
  light: lightTheme,
};

// Default palette (also the no-provider fallback).
export const t: Theme = darkTheme;

// Brand gradient — intentionally identical across themes.
export const gradient = "linear-gradient(135deg, #60a5fa, #a855f7)";
