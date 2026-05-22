import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../components/Badge";
import { t } from "../theme/atmos";

describe("Badge", () => {
  it("renders its label text", () => {
    render(<Badge>running</Badge>);
    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("defaults to the green tone dot", () => {
    const { container } = render(<Badge>ok</Badge>);
    // The dot is the inner span carrying the tone background.
    const dot = container.querySelector("span > span");
    expect(dot).toHaveStyle({ background: t.green });
  });

  it.each([
    ["amber", t.amber],
    ["red", t.red],
    ["blue", t.blue],
    ["muted", t.muted],
  ] as const)("colours the dot for the %s tone", (tone, color) => {
    const { container } = render(<Badge tone={tone}>x</Badge>);
    const dot = container.querySelector("span > span");
    expect(dot).toHaveStyle({ background: color });
  });

  it("renders non-string children", () => {
    render(
      <Badge tone="blue">
        <strong>node</strong>
      </Badge>,
    );
    expect(screen.getByText("node")).toBeInTheDocument();
  });
});
