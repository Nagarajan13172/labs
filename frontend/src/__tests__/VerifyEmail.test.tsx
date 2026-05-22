import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("../api/auth", () => ({ authApi: { verifyEmail: vi.fn() } }));

import { VerifyEmail } from "../pages/VerifyEmail";
import { authApi } from "../api/auth";

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/verify${search}`]}>
      <Routes>
        <Route path="/auth/verify" element={<VerifyEmail />} />
        <Route path="/auth/signin" element={<div>sign in page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(authApi.verifyEmail).mockResolvedValue(null);
});

describe("VerifyEmail", () => {
  it("errors immediately when the token is missing", () => {
    renderAt("");
    expect(screen.getByText("Verification failed")).toBeInTheDocument();
    expect(screen.getByText("Missing verification token.")).toBeInTheDocument();
    expect(authApi.verifyEmail).not.toHaveBeenCalled();
  });

  it("verifies the token and shows success", async () => {
    renderAt("?token=good-token");
    expect(await screen.findByText("Email verified")).toBeInTheDocument();
    expect(authApi.verifyEmail).toHaveBeenCalledWith("good-token");
    expect(screen.getByRole("link", { name: /Sign in/ })).toHaveAttribute("href", "/auth/signin");
  });

  it("shows the API error message on failure", async () => {
    const { ApiError } = await import("../api/client");
    vi.mocked(authApi.verifyEmail).mockRejectedValueOnce(new ApiError("Token expired", 400));
    renderAt("?token=stale");
    expect(await screen.findByText("Verification failed")).toBeInTheDocument();
    expect(screen.getByText("Token expired")).toBeInTheDocument();
  });
});
