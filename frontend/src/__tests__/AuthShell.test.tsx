import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { AuthShell } from "../components/AuthShell";
import { renderWithRouter } from "./test-utils";

describe("AuthShell", () => {
  it("renders the brand wordmark linking back to sign in", () => {
    renderWithRouter(<AuthShell>card</AuthShell>);
    expect(screen.getByText("yslabs")).toBeInTheDocument();
    const brand = screen.getByText("yslabs").closest("a");
    expect(brand).toHaveAttribute("href", "/auth/signin");
  });

  it("renders the children content", () => {
    renderWithRouter(<AuthShell>my card body</AuthShell>);
    expect(screen.getByText("my card body")).toBeInTheDocument();
  });

  it("shows the version footer and a docs link", () => {
    renderWithRouter(<AuthShell>x</AuthShell>);
    expect(screen.getByText(/youngstorage labs · v0\.6/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "http://localhost:8000/docs",
    );
  });

  it("renders an optional footerRight slot", () => {
    renderWithRouter(<AuthShell footerRight={<span>status: ok</span>}>x</AuthShell>);
    expect(screen.getByText("status: ok")).toBeInTheDocument();
  });
});
