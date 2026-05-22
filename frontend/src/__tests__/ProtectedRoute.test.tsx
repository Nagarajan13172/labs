import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { fakeUser } from "./test-utils";

const { authState } = vi.hoisted(() => ({
  authState: { current: { user: null as ReturnType<typeof Object> | null, loading: false } },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => authState.current,
}));

import { ProtectedRoute } from "../auth/ProtectedRoute";

function renderAt(path = "/secret") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <div>secret content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth/signin" element={<div>sign in page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.current = { user: null, loading: false };
});

describe("ProtectedRoute", () => {
  it("shows the authenticating placeholder while loading", () => {
    authState.current = { user: null, loading: true };
    renderAt();
    expect(screen.getByText("Authenticating…")).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("redirects to sign in when there is no user", () => {
    authState.current = { user: null, loading: false };
    renderAt();
    expect(screen.getByText("sign in page")).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("renders the protected children when authenticated", () => {
    authState.current = { user: fakeUser(), loading: false };
    renderAt();
    expect(screen.getByText("secret content")).toBeInTheDocument();
  });
});
