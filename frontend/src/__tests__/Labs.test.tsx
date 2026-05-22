import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, fakeUser, fakeLab, fakeLabCredentials } from "./test-utils";

vi.mock("../components/Nav", () => ({ Nav: () => <nav data-testid="nav" /> }));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ user: fakeUser({ username: "alice" }) }) }));
vi.mock("../api/labs", () => ({
  labsApi: {
    get: vi.fn(),
    deploy: vi.fn(),
    stop: vi.fn(),
    start: vi.fn(),
    destroy: vi.fn(),
    credentials: vi.fn(),
    stats: vi.fn(),
  },
}));

import { Labs } from "../pages/Labs";
import { labsApi } from "../api/labs";

beforeEach(() => {
  vi.mocked(labsApi.get).mockResolvedValue(null);
  vi.mocked(labsApi.deploy).mockResolvedValue(fakeLab());
  vi.mocked(labsApi.stop).mockResolvedValue(fakeLab({ status: "stopped" }));
  vi.mocked(labsApi.start).mockResolvedValue(fakeLab({ status: "running" }));
  vi.mocked(labsApi.destroy).mockResolvedValue(null);
  vi.mocked(labsApi.credentials).mockResolvedValue(fakeLabCredentials({ code_server_password: "topsecret" }));
});

describe("Labs", () => {
  it("shows the empty state and deploys a lab", async () => {
    renderWithRouter(<Labs />);
    expect(await screen.findByText("Nothing deployed yet")).toBeInTheDocument();

    // After deploy, the list reloads and shows the lab.
    vi.mocked(labsApi.get).mockResolvedValue(fakeLab({ name: "alice-lab", status: "running" }));
    await userEvent.click(screen.getAllByRole("button", { name: /Deploy lab/ })[0]);

    await waitFor(() => expect(labsApi.deploy).toHaveBeenCalled());
    expect(await screen.findByText("alice-lab")).toBeInTheDocument();
  });

  it("renders connection details and status for a running lab", async () => {
    vi.mocked(labsApi.get).mockResolvedValue(
      fakeLab({ name: "alice-lab", status: "running", host_port: 8443, internal_ip: "10.0.0.5" }),
    );
    renderWithRouter(<Labs />);

    expect(await screen.findByText("Connection")).toBeInTheDocument();
    expect(screen.getByText("https://alice.lab.localhost")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:8443")).toBeInTheDocument();
    // The password starts masked.
    expect(screen.getByText("••••••••••••••••")).toBeInTheDocument();
    // Action buttons reflect the running state.
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redeploy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Destroy" })).toBeInTheDocument();
  });

  it("reveals the code-server password on demand", async () => {
    vi.mocked(labsApi.get).mockResolvedValue(fakeLab({ status: "running" }));
    renderWithRouter(<Labs />);
    await screen.findByText("Connection");

    await userEvent.click(screen.getByText("Reveal"));
    expect(await screen.findByText("topsecret")).toBeInTheDocument();
    expect(labsApi.credentials).toHaveBeenCalled();
  });

  it("stops a running lab", async () => {
    vi.mocked(labsApi.get).mockResolvedValue(fakeLab({ status: "running" }));
    renderWithRouter(<Labs />);
    await screen.findByText("Connection");
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(labsApi.stop).toHaveBeenCalled());
  });

  it("starts a stopped lab", async () => {
    vi.mocked(labsApi.get).mockResolvedValue(fakeLab({ status: "stopped", host_port: null }));
    renderWithRouter(<Labs />);
    await screen.findByText("Connection");
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(labsApi.start).toHaveBeenCalled());
  });

  it("destroys a lab after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(labsApi.get).mockResolvedValue(fakeLab({ status: "running" }));
    renderWithRouter(<Labs />);
    await screen.findByText("Connection");
    await userEvent.click(screen.getByRole("button", { name: "Destroy" }));
    await waitFor(() => expect(labsApi.destroy).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });

  it("does not destroy when confirmation is dismissed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    vi.mocked(labsApi.get).mockResolvedValue(fakeLab({ status: "running" }));
    renderWithRouter(<Labs />);
    await screen.findByText("Connection");
    await userEvent.click(screen.getByRole("button", { name: "Destroy" }));
    expect(labsApi.destroy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("surfaces an error when an action fails", async () => {
    const { ApiError } = await import("../api/client");
    vi.mocked(labsApi.deploy).mockRejectedValueOnce(new ApiError("Quota exceeded", 403));
    renderWithRouter(<Labs />);
    await screen.findByText("Nothing deployed yet");
    await userEvent.click(screen.getAllByRole("button", { name: /Deploy lab/ })[0]);
    expect(await screen.findByText("Quota exceeded")).toBeInTheDocument();
  });
});
