// Sleek gradient triangle mark (V4 ATMOS).
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" style={{ display: "block" }}>
      <defs>
        <linearGradient id="atmos-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d="M11 1 L21 19 L1 19 Z" fill="url(#atmos-logo)" />
    </svg>
  );
}
