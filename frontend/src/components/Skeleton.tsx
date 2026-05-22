import type { CSSProperties } from "react";

// Shimmering placeholder block. Theme-aware via the .ys-skeleton CSS class.
export function Skeleton({
  w = "100%",
  h = 14,
  r = 6,
  style,
}: {
  w?: number | string;
  h?: number | string;
  r?: number;
  style?: CSSProperties;
}) {
  return <div className="ys-skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// A few stacked lines of decreasing width — for paragraph-ish content.
export function SkeletonLines({ lines = 3, gap = 8 }: { lines?: number; gap?: number }) {
  const widths = ["100%", "92%", "78%", "85%", "70%"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} w={widths[i % widths.length]} h={12} />
      ))}
    </div>
  );
}

// A list of row placeholders (dot + label + value), e.g. peers / databases / users.
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Skeleton w={8} h={8} r={999} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton w="40%" h={13} />
            <Skeleton w="60%" h={11} />
          </div>
          <Skeleton w={48} h={12} />
        </div>
      ))}
    </div>
  );
}
