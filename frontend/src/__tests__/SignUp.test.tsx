import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "./test-utils";

vi.mock("../api/auth", () => ({ authApi: { signup: vi.fn() } }));

import { SignUp } from "../pages/SignUp";
import { authApi } from "../api/auth";

beforeEach(() => {
  vi.mocked(authApi.signup).mockResolvedValue(null);
});

async function fillForm() {
  await userEvent.type(screen.getByPlaceholderText("you@gmail.com"), "  alice@gmail.com  ");
  await userEvent.type(screen.getByPlaceholderText("••••••••••••"), "Passw0rd!");
  await userEvent.type(screen.getByPlaceholderText("10 digits"), " 1234567890 ");
}

describe("SignUp", () => {
  it("renders the account creation form", () => {
    renderWithRouter(<SignUp />);
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@gmail.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("10 digits")).toBeInTheDocument();
  });

  it("submits trimmed values and shows the verification screen", async () => {
    renderWithRouter(<SignUp />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /Create account/ }));

    await waitFor(() =>
      expect(authApi.signup).toHaveBeenCalledWith({
        email: "alice@gmail.com",
        password: "Passw0rd!",
        phone: "1234567890",
      }),
    );
    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    // The submitted email is echoed back.
    expect(screen.getByText("alice@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /localhost:8025/ })).toBeInTheDocument();
  });

  it("shows an error message when sign up fails", async () => {
    const { ApiError } = await import("../api/client");
    vi.mocked(authApi.signup).mockRejectedValueOnce(new ApiError("Email already used", 409));
    renderWithRouter(<SignUp />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /Create account/ }));
    expect(await screen.findByText("Email already used")).toBeInTheDocument();
    expect(screen.queryByText("Check your email")).not.toBeInTheDocument();
  });

  it("links back to sign in", () => {
    renderWithRouter(<SignUp />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/signin");
  });
});
