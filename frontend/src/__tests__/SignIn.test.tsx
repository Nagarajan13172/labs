import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const { navigate, signin } = vi.hoisted(() => ({ navigate: vi.fn(), signin: vi.fn() }));

vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ signin }) }));

import { SignIn } from "../pages/SignIn";

let fetchMock: ReturnType<typeof vi.fn>;

function renderSignIn(state?: { from?: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/auth/signin", state }]}>
      <Routes>
        <Route path="/auth/signin" element={<SignIn />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  signin.mockResolvedValue(undefined);
  fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ status: true }) });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("SignIn", () => {
  it("renders the heading and credential fields", async () => {
    renderSignIn();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@gmail.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••••••")).toBeInTheDocument();
    // Flush the async /readyz state update so it doesn't leak past the test.
    await screen.findByText("all systems operational");
  });

  it("shows the readiness status from /readyz", async () => {
    renderSignIn();
    expect(await screen.findByText("all systems operational")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/readyz");
  });

  it("shows a degraded status when readiness reports unhealthy", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ status: false }) });
    renderSignIn();
    expect(await screen.findByText("degraded")).toBeInTheDocument();
  });

  it("signs in and navigates to the default route", async () => {
    renderSignIn();
    await userEvent.type(screen.getByPlaceholderText("you@gmail.com"), "  alice@gmail.com  ");
    await userEvent.type(screen.getByPlaceholderText("••••••••••••"), "pw");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/ }));

    await waitFor(() => expect(signin).toHaveBeenCalledWith("alice@gmail.com", "pw"));
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("returns to the originally requested route after signing in", async () => {
    renderSignIn({ from: "/labs" });
    await userEvent.type(screen.getByPlaceholderText("you@gmail.com"), "alice@gmail.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••••••"), "pw");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/ }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/labs", { replace: true }));
  });

  it("surfaces an ApiError message on failed sign in", async () => {
    const { ApiError } = await import("../api/client");
    signin.mockRejectedValueOnce(new ApiError("Invalid credentials", 401));
    renderSignIn();
    await userEvent.type(screen.getByPlaceholderText("you@gmail.com"), "a@gmail.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••••••"), "bad");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/ }));
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("links to the sign-up page", async () => {
    renderSignIn();
    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/auth/signup");
    await screen.findByText("all systems operational");
  });
});
