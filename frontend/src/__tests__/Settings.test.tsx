import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, fakeUser } from "./test-utils";
import type { AdminStats, AdminUser } from "../api/admin";

const { auth } = vi.hoisted(() => ({ auth: { current: { user: null as ReturnType<typeof Object> | null } } }));

vi.mock("../components/Nav", () => ({ Nav: () => <nav data-testid="nav" /> }));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => auth.current }));
vi.mock("../api/admin", () => ({
  adminApi: { stats: vi.fn(), listUsers: vi.fn(), setRole: vi.fn(), setActive: vi.fn() },
}));

import { Settings } from "../pages/Settings";
import { adminApi } from "../api/admin";

const stats: AdminStats = {
  users_total: 5,
  users_verified: 4,
  labs_total: 3,
  labs_running: 2,
  peers_total: 7,
  databases_total: 1,
};

const adminUser = (over: Partial<AdminUser> = {}): AdminUser => ({
  id: "u2",
  email: "bob@gmail.com",
  username: "bob",
  role: "user",
  is_verified: true,
  is_active: true,
  created_at: "2024-01-01T00:00:00.000Z",
  labs: 1,
  peers: 2,
  databases: 0,
  ...over,
});

beforeEach(() => {
  vi.mocked(adminApi.stats).mockResolvedValue(stats);
  vi.mocked(adminApi.listUsers).mockResolvedValue([
    adminUser({ id: "me", username: "alice", role: "admin" }),
    adminUser(),
  ]);
  vi.mocked(adminApi.setRole).mockResolvedValue(adminUser({ role: "admin" }));
  vi.mocked(adminApi.setActive).mockResolvedValue(adminUser({ is_active: false }));
});

describe("Settings — account", () => {
  it("renders the account card for any user", () => {
    auth.current = { user: fakeUser({ username: "alice", role: "user" }) };
    renderWithRouter(<Settings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("alice@gmail.com")).toBeInTheDocument();
  });

  it("hides admin tooling from non-admins", () => {
    auth.current = { user: fakeUser({ role: "user" }) };
    renderWithRouter(<Settings />);
    expect(screen.getByText(/require an admin role/)).toBeInTheDocument();
    expect(adminApi.listUsers).not.toHaveBeenCalled();
  });
});

describe("Settings — admin", () => {
  beforeEach(() => {
    auth.current = { user: fakeUser({ id: "me", username: "alice", role: "admin" }) };
  });

  it("loads platform stats and the user table", async () => {
    renderWithRouter(<Settings />);
    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByText("Users · 2")).toBeInTheDocument();
    // Stats render (users_total = 5).
    expect(screen.getByText("5")).toBeInTheDocument();
    // The current admin is marked as themselves.
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("changes another user's role", async () => {
    renderWithRouter(<Settings />);
    await screen.findByText("bob");
    const selects = screen.getAllByRole("combobox");
    const bobSelect = selects.find((s) => !(s as HTMLSelectElement).disabled)!;
    await userEvent.selectOptions(bobSelect, "admin");
    await waitFor(() => expect(adminApi.setRole).toHaveBeenCalledWith("u2", "admin"));
  });

  it("suspends an active user", async () => {
    renderWithRouter(<Settings />);
    await screen.findByText("bob");
    const suspend = screen
      .getAllByRole("button", { name: "Suspend" })
      .find((b) => !(b as HTMLButtonElement).disabled)!;
    await userEvent.click(suspend);
    await waitFor(() => expect(adminApi.setActive).toHaveBeenCalledWith("u2", false));
  });

  it("disables actions on the current admin's own row", async () => {
    renderWithRouter(<Settings />);
    await screen.findByText("(you)");
    // alice's own role select is disabled (cannot self-edit).
    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(selects.some((s) => s.disabled)).toBe(true);
  });

  it("shows an error when a mutation fails", async () => {
    const { ApiError } = await import("../api/client");
    vi.mocked(adminApi.setActive).mockRejectedValueOnce(new ApiError("Forbidden", 403));
    renderWithRouter(<Settings />);
    await screen.findByText("bob");
    const suspend = screen
      .getAllByRole("button", { name: "Suspend" })
      .find((b) => !(b as HTMLButtonElement).disabled)!;
    await userEvent.click(suspend);
    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
  });
});
