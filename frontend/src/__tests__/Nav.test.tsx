import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, fakeUser } from "./test-utils";

// --- mocks (hoisted so the vi.mock factories can reference them) -------------
const { navigate, authState } = vi.hoisted(() => ({
  navigate: vi.fn(),
  authState: {
    current: {
      user: null as ReturnType<typeof Object> | null,
      loading: false,
      signin: vi.fn(),
      signout: vi.fn(),
      refreshUser: vi.fn(),
    },
  },
}));

vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => authState.current,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// The command palette loads live resources on open; stub those API modules.
vi.mock("../api/labs", () => ({ labsApi: { get: vi.fn().mockResolvedValue(null) } }));
vi.mock("../api/network", () => ({ networkApi: { listPeers: vi.fn().mockResolvedValue([]) } }));
vi.mock("../api/services", () => ({ servicesApi: { listDatabases: vi.fn().mockResolvedValue([]) } }));

import { Nav } from "../components/Nav";

beforeEach(() => {
  authState.current = {
    user: fakeUser({ username: "alice", role: "admin" }),
    loading: false,
    signin: vi.fn(),
    signout: vi.fn(),
    refreshUser: vi.fn(),
  };
});

describe("Nav", () => {
  it("shows the signed-in username and role", () => {
    renderWithRouter(<Nav />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("falls back to placeholders when there is no user", () => {
    authState.current.user = null;
    renderWithRouter(<Nav />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument();
  });

  it("renders all navigation tabs", () => {
    renderWithRouter(<Nav />);
    for (const label of ["Overview", "Labs", "Network", "Databases", "Jobs", "Settings"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("navigates when a tab is clicked", async () => {
    renderWithRouter(<Nav />);
    await userEvent.click(screen.getByRole("button", { name: "Network" }));
    expect(navigate).toHaveBeenCalledWith("/network");
  });

  it("the brand button navigates home", async () => {
    renderWithRouter(<Nav />);
    await userEvent.click(screen.getByRole("button", { name: /yslabs/ }));
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("the + New button navigates to labs", async () => {
    renderWithRouter(<Nav />);
    await userEvent.click(screen.getByRole("button", { name: "+ New" }));
    expect(navigate).toHaveBeenCalledWith("/labs");
  });

  it("signs out from the avatar button", async () => {
    renderWithRouter(<Nav />);
    await userEvent.click(screen.getByTitle("Sign out"));
    expect(authState.current.signout).toHaveBeenCalledOnce();
  });

  it("opens the command palette via the search button", async () => {
    renderWithRouter(<Nav />);
    await userEvent.click(screen.getByRole("button", { name: /Search/ }));
    expect(
      await screen.findByPlaceholderText("Search pages, labs, peers, databases…"),
    ).toBeInTheDocument();
  });

  it("opens the command palette via the ⌘K shortcut", async () => {
    renderWithRouter(<Nav />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(
      await screen.findByPlaceholderText("Search pages, labs, peers, databases…"),
    ).toBeInTheDocument();
    // The palette load fires the resource fetches.
    const { labsApi } = await import("../api/labs");
    await waitFor(() => expect(labsApi.get).toHaveBeenCalled());
  });

  it("links to the API docs", () => {
    renderWithRouter(<Nav />);
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "http://localhost:8000/docs",
    );
  });
});
