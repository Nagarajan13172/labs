import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "../components/Card";

describe("Card", () => {
  it("renders body children", () => {
    render(<Card>body content</Card>);
    expect(screen.getByText("body content")).toBeInTheDocument();
  });

  it("renders the title and action when a title is provided", () => {
    render(
      <Card title="Active lab" action={<button>View all</button>}>
        body
      </Card>,
    );
    expect(screen.getByText("Active lab")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View all" })).toBeInTheDocument();
  });

  it("omits the header row when no title is given", () => {
    render(<Card action={<button>orphan action</button>}>body</Card>);
    // Action only renders inside the title row, so it should be absent.
    expect(screen.queryByRole("button", { name: "orphan action" })).not.toBeInTheDocument();
  });

  it("drops body padding when padded is false", () => {
    const { container } = render(
      <Card padded={false}>flush</Card>,
    );
    const body = screen.getByText("flush");
    expect(body).toHaveStyle({ padding: "0px" });
    expect(container).toBeTruthy();
  });

  it("merges custom container and body styles", () => {
    render(
      <Card style={{ width: 320 }} bodyStyle={{ gap: 8 }}>
        styled
      </Card>,
    );
    expect(screen.getByText("styled")).toHaveStyle({ gap: "8px" });
  });
});
