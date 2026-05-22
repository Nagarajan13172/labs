import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Area } from "../components/Area";
import { t } from "../theme/atmos";

describe("Area", () => {
  it("renders an svg with a polyline and a filled polygon", () => {
    const { container } = render(<Area values={[1, 2, 3, 4]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("polyline")).toBeInTheDocument();
    expect(container.querySelector("polygon")).toBeInTheDocument();
  });

  it("plots one point per value across the width", () => {
    const { container } = render(<Area values={[0, 50, 100]} />);
    const polyline = container.querySelector("polyline")!;
    const points = polyline.getAttribute("points")!.trim().split(" ");
    expect(points).toHaveLength(3);
    // First point pinned to x=0, last to x=100 (viewBox width).
    expect(points[0].startsWith("0.00,")).toBe(true);
    expect(points[2].startsWith("100.00,")).toBe(true);
  });

  it("maps the maximum value to the top of the chart (y=0)", () => {
    const { container } = render(<Area values={[0, 10]} />);
    const points = container.querySelector("polyline")!.getAttribute("points")!;
    // Highest value -> smallest y. The peak should sit at y=0.00.
    expect(points).toContain(",0.00");
  });

  it("uses the provided stroke colour", () => {
    const { container } = render(<Area values={[1, 2]} color={t.cyan} />);
    expect(container.querySelector("polyline")).toHaveAttribute("stroke", t.cyan);
  });

  it("does not throw on a single data point", () => {
    expect(() => render(<Area values={[5]} />)).not.toThrow();
  });

  it("derives a unique gradient id from colour + opacity", () => {
    const { container } = render(<Area values={[1, 2]} color="#abcdef" fillOpacity={0.5} />);
    expect(container.querySelector("linearGradient")).toHaveAttribute(
      "id",
      "atmos-area-abcdef-50",
    );
  });
});
