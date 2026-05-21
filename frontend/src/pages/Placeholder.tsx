import { t } from "../theme/atmos";
import { Page } from "../components/Page";
import { Nav } from "../components/Nav";
import { Badge } from "../components/Badge";

// Scaffolded section — wired into the nav, surface to be built next.
export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <Page>
      <Nav />
      <div
        className="atmos-fade"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Badge tone="blue">{phase}</Badge>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.8 }}>{title}</div>
        <div style={{ color: t.muted, fontSize: 14, maxWidth: 520, lineHeight: 1.6 }}>
          The backend API for this section is live. The {title.toLowerCase()} surface is scaffolded
          into the navigation and will be built in the next pass.
        </div>
      </div>
    </Page>
  );
}
