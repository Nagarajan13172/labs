import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, fakeUser, fakeLab, fakePeer, fakeDatabase, fakeLabStats } from "./test-utils";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock("../components/Nav", () => ({ Nav: () => <nav data-testid="nav" /> }));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ user: fakeUser({ username: "alice" }) }) }));
vi.mock("../api/labs", () => ({ labsApi: { get: vi.fn() } }));
vi.mock("../api/network", () => ({ networkApi: { listPeers: vi.fn() } }));
vi.mock("../api/services", () => ({ servicesApi: { listDatabases: vi.fn() } }));

const { liveStats } = vi.hoisted(() => ({
  liveStats: {
    current: { stats: null, cpu: [], mem: [], net: [], netRate: 0 } as import("../hooks/useLabStats").LiveStats,
  },
}));
vi.mock("../hooks/useLabStats", () => ({ useLabStats: () => liveStats.current }));

import { Dashboard } from "../pages/Dashboard";
import { labsApi } from "../api/labs";
import { networkApi } from "../api/network";
import { servicesApi } from "../api/services";

beforeEach(() => {
  liveStats.current = { stats: null, cpu: [], mem: [], net: [], netRate: 0 };
  vi.mocked(labsApi.get).mockResolvedValue(null);
  vi.mocked(networkApi.listPeers).mockResolvedValue([]);
  vi.mocked(servicesApi.listDatabases).mockResolvedValue([]);
});

describe("Dashboard", () => {
  it("greets the signed-in user", async () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByText("Welcome back, alice")).toBeInTheDocument();
  });

  it("shows the empty workspace state when nothing is provisioned", async () => {
    renderWithRouter(<Dashboard />);
    expect(await screen.findByText("No lab deployed")).toBeInTheDocument();
    expect(screen.getByText(/no lab running/)).toBeInTheDocument();
    expect(screen.getByText("No peers yet.")).toBeInTheDocument();
    expect(screen.getByText("No databases yet.")).toBeInTheDocument();
  });

  it("renders a running lab with live metrics and resources", async () => {
    vi.mocked(labsApi.get).mockResolvedValue(fakeLab({ name: "alice-lab", status: "running", host_port: 8443 }));
    vi.mocked(networkApi.listPeers).mockResolvedValue([fakePeer({ device_name: "macbook" })]);
    vi.mocked(servicesApi.listDatabases).mockResolvedValue([fakeDatabase({ db_name: "shop_db" })]);
    liveStats.current = { stats: fakeLabStats({ cpu_percent: 33 }), cpu: [10, 33], mem: [20, 25], net: [5], netRate: 2048 };

    renderWithRouter(<Dashboard />);

    expect(await screen.findByText("alice-lab")).toBeInTheDocument();
    expect(screen.getByText(/1 lab running/)).toBeInTheDocument();
    // The peer/db surface in both the activity feed and their dedicated cards.
    expect(screen.getAllByText("macbook").length).toBeGreaterThan(0);
    expect(screen.getByText("shop_db")).toBeInTheDocument();
    // The "Open code-server" link points at the host port.
    const openLinks = screen.getAllByRole("link");
    expect(openLinks.some((a) => a.getAttribute("href") === "http://localhost:8443")).toBe(true);
  });

  it("navigates to labs from the Deploy lab button", async () => {
    renderWithRouter(<Dashboard />);
    await screen.findByText("No lab deployed");
    await userEvent.click(screen.getByRole("button", { name: "Deploy lab" }));
    expect(navigate).toHaveBeenCalledWith("/labs");
  });

  it("tolerates failed resource fetches", async () => {
    vi.mocked(networkApi.listPeers).mockRejectedValue(new Error("down"));
    vi.mocked(servicesApi.listDatabases).mockRejectedValue(new Error("down"));
    renderWithRouter(<Dashboard />);
    await waitFor(() => expect(screen.getByText("No peers yet.")).toBeInTheDocument());
  });
});
