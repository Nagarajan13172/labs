import { useTheme, useThemeMode } from "../theme/ThemeContext";

// Compact icon button that flips between light and dark. Shows the icon for the
// theme you'd switch *to*.
export function ThemeToggle({ size = 28 }: { size?: number }) {
  const t = useTheme();
  const { resolved, toggle } = useThemeMode();
  const isDark = resolved === "dark";
  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label="Toggle color theme"
      style={{
        width: size + 4,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: t.bg2,
        border: `1px solid ${t.rule2}`,
        borderRadius: 6,
        color: t.muted,
        cursor: "pointer",
      }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
