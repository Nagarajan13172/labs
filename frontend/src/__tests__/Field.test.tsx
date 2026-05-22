import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field } from "../components/Field";
import { t } from "../theme/atmos";

describe("Field", () => {
  it("associates the visible label with the input", () => {
    render(<Field label="Email" />);
    // The label text renders, and the input is reachable.
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders an optional hint node", () => {
    render(<Field label="Password" hint={<a href="#">Forgot?</a>} />);
    expect(screen.getByRole("link", { name: "Forgot?" })).toBeInTheDocument();
  });

  it("relays typing through onChange", async () => {
    const onChange = vi.fn();
    render(<Field label="Email" onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "hi");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows a blue focus ring on focus and clears it on blur", async () => {
    render(<Field label="Email" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveStyle({ borderColor: t.rule2 });
    await userEvent.click(input);
    expect(input).toHaveStyle({ borderColor: t.blue });
    await userEvent.tab();
    expect(input).toHaveStyle({ borderColor: t.rule2 });
  });

  it("forwards input attributes (type, required, placeholder, value)", () => {
    render(
      <Field
        label="Password"
        type="password"
        required
        placeholder="••••"
        value="secret"
        onChange={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText("••••");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toBeRequired();
    expect(input).toHaveValue("secret");
  });
});
