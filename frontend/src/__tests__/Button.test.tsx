import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../components/Button";
import { t } from "../theme/atmos";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("fires onClick when enabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("uses the near-white primary surface", () => {
    render(<Button primary>Primary</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ background: t.text2, color: t.bg });
  });

  it("uses the red danger surface", () => {
    render(<Button danger>Delete</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ background: t.red });
  });

  it("renders a transparent ghost surface", () => {
    render(<Button ghost>Ghost</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ background: "transparent" });
  });

  it("applies size-specific font sizing", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ fontSize: "12px" });
    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ fontSize: "14px" });
  });

  it("dims and shows not-allowed cursor when disabled", () => {
    render(<Button disabled>Off</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ opacity: "0.55", cursor: "not-allowed" });
  });

  it("forwards arbitrary props like type and merges custom style", () => {
    render(
      <Button type="submit" style={{ marginTop: 4 }}>
        Submit
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("type", "submit");
    expect(btn).toHaveStyle({ marginTop: "4px" });
  });
});
