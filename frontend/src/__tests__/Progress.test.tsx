import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Progress } from "../components/Progress";
import { t } from "../theme/atmos";

// The track is the outer div; the fill is its only child. Width is the
// meaningful behaviour: it clamps to [0, 100]%.
function fill(container: HTMLElement): HTMLElement {
  return container.firstElementChild!.firstElementChild as HTMLElement;
}
const fillWidth = (container: HTMLElement) => fill(container).style.width;

describe("Progress", () => {
  it("renders a proportional fill for a value within range", () => {
    const { container } = render(<Progress value={50} />);
    expect(fillWidth(container)).toBe("50%");
  });

  it("scales against a custom max", () => {
    const { container } = render(<Progress value={2} max={8} />);
    expect(fillWidth(container)).toBe("25%");
  });

  it("clamps values above max to 100%", () => {
    const { container } = render(<Progress value={250} />);
    expect(fillWidth(container)).toBe("100%");
  });

  it("clamps negative values to 0%", () => {
    const { container } = render(<Progress value={-40} />);
    expect(fillWidth(container)).toBe("0%");
  });

  it("uses the supplied colour for the fill", () => {
    const { container } = render(<Progress value={10} color={t.purple} />);
    expect(fill(container)).toHaveStyle({ background: t.purple });
  });
});
