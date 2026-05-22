import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Page } from "../components/Page";
import { t } from "../theme/atmos";

describe("Page", () => {
  it("renders its children", () => {
    render(<Page>content here</Page>);
    expect(screen.getByText("content here")).toBeInTheDocument();
  });

  it("uses the flat background by default", () => {
    render(<Page>flat</Page>);
    expect(screen.getByText("flat")).toHaveStyle({ background: t.bg });
  });

  it("does not apply the flat solid colour when gradient is requested", () => {
    // jsdom's CSSOM can't represent the composed radial-gradient value (it gets
    // dropped), so a fresh gradient Page simply lacks the flat solid colour.
    render(<Page gradient>glow</Page>);
    expect(screen.getByText("glow")).not.toHaveStyle({ background: t.bg });
  });

  it("keeps position relative so the backdrop layers sit correctly", () => {
    render(<Page gradient>glow</Page>);
    expect(screen.getByText("glow")).toHaveStyle({ position: "relative" });
  });

  it("merges custom styles", () => {
    render(<Page style={{ padding: 10 }}>styled</Page>);
    expect(screen.getByText("styled")).toHaveStyle({ padding: "10px" });
  });
});
