import { t } from "../theme/atmos";

// Area-style sparkline (filled gradient under a polyline). Stretches to fill.
export function Area({
  values,
  color = t.blue,
  width = "100%",
  height = 80,
  fillOpacity = 0.25,
}: {
  values: number[];
  color?: string;
  width?: number | string;
  height?: number;
  fillOpacity?: number;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 100;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = pts.join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const gid = `atmos-area-${color.replace("#", "")}-${Math.round(fillOpacity * 100)}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
