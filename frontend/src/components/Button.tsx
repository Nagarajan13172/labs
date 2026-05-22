import type { ButtonHTMLAttributes } from "react";
import { useTheme } from "../theme/ThemeContext";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
  danger?: boolean;
  ghost?: boolean;
  size?: "sm" | "md" | "lg";
}

// V4 button — primary is the near-white pill, default is a subtle dark surface.
export function Button({ primary, danger, ghost, size = "md", style, disabled, ...rest }: Props) {
  const t = useTheme();
  const padding = size === "sm" ? "4px 10px" : size === "lg" ? "10px 16px" : "7px 14px";
  const fontSize = size === "sm" ? 12 : size === "lg" ? 14 : 13;
  const background = primary ? t.text2 : danger ? t.red : ghost ? "transparent" : t.cardHi;
  const color = primary ? t.bg : danger ? "#fff" : t.text;
  const border = `1px solid ${primary ? t.text2 : danger ? t.red : ghost ? "transparent" : t.rule2}`;
  return (
    <button
      disabled={disabled}
      style={{
        background,
        color,
        border,
        padding,
        borderRadius: 6,
        fontFamily: t.sans,
        fontSize,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    />
  );
}
