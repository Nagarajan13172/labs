import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Logo } from "../components/Logo";

describe("Logo", () => {
  it("renders an svg triangle mark at the default size", () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "22");
    expect(svg).toHaveAttribute("height", "22");
    expect(svg.querySelector("path")).toBeInTheDocument();
  });

  it("honours a custom size", () => {
    const { container } = render(<Logo size={40} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "40");
    expect(svg).toHaveAttribute("height", "40");
  });
});
