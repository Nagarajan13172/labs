import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, fakePeer } from "./test-utils";
import type { Quota } from "../api/quota";

vi.mock("../components/Nav", () => ({ Nav: () => <nav data-testid="nav" /> }));
vi.mock("../api/network", () => ({
  networkApi: {
    listPeers: vi.fn(),
    createPeer: vi.fn(),
    deletePeer: vi.fn(),
    peerConfig: vi.fn(),
    peerQrBlob: vi.fn(),
    listDomains: vi.fn(),
    addDomain: vi.fn(),
    removeDomain: vi.fn(),
  },
}));
vi.mock("../api/quota", () => ({ quotaApi: { get: vi.fn() } }));

import { Network } from "../pages/Network";
import { networkApi } from "../api/network";
import { quotaApi } from "../api/quota";

const quota: Quota = { max_client_peers: 5, max_domains: 3, max_databases: 3 };

beforeEach(() => {
  vi.mocked(networkApi.listPeers).mockResolvedValue([fakePeer({ device_name: "macbook" })]);
  vi.mocked(networkApi.listDomains).mockResolvedValue({
    auto_host: "alice.lab.localhost",
    domains: ["app.example.com"],
  });
  vi.mocked(quotaApi.get).mockResolvedValue(quota);
  vi.mocked(networkApi.peerConfig).mockResolvedValue("[Interface]\nPrivateKey=abc");
  vi.mocked(networkApi.peerQrBlob).mockResolvedValue(new Blob(["png"]));
  vi.mocked(networkApi.createPeer).mockResolvedValue(fakePeer({ id: "p2", device_name: "phone" }));
  vi.mocked(networkApi.deletePeer).mockResolvedValue(null);
  vi.mocked(networkApi.addDomain).mockResolvedValue({
    auto_host: "alice.lab.localhost",
    domains: ["app.example.com", "new.example.com"],
  });
  vi.mocked(networkApi.removeDomain).mockResolvedValue(null);
});

describe("Network", () => {
  it("lists peers and auto-selects the first, loading its config + QR", async () => {
    renderWithRouter(<Network />);
    expect(await screen.findByText("Peer · macbook")).toBeInTheDocument();
    expect(await screen.findByText(/PrivateKey=abc/)).toBeInTheDocument();
    expect(screen.getByAltText("WireGuard QR")).toBeInTheDocument();
  });

  it("shows the device and domain quota counters", async () => {
    renderWithRouter(<Network />);
    expect(await screen.findByText("Devices · 1/5")).toBeInTheDocument();
    expect(screen.getByText("Custom domains · 1/3")).toBeInTheDocument();
    expect(screen.getByText("app.example.com")).toBeInTheDocument();
  });

  it("adds a new peer", async () => {
    renderWithRouter(<Network />);
    await screen.findByText("Peer · macbook");
    const input = screen.getByPlaceholderText("device name (e.g. macbook)");
    await userEvent.type(input, "  phone  {Enter}");
    await waitFor(() => expect(networkApi.createPeer).toHaveBeenCalledWith("phone"));
  });

  it("revokes the selected peer after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithRouter(<Network />);
    await screen.findByText("Peer · macbook");
    await userEvent.click(screen.getByRole("button", { name: /Revoke peer/ }));
    await waitFor(() => expect(networkApi.deletePeer).toHaveBeenCalledWith("peer1"));
    confirmSpy.mockRestore();
  });

  it("does not revoke when confirmation is dismissed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithRouter(<Network />);
    await screen.findByText("Peer · macbook");
    await userEvent.click(screen.getByRole("button", { name: /Revoke peer/ }));
    expect(networkApi.deletePeer).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("adds a custom domain", async () => {
    renderWithRouter(<Network />);
    await screen.findByText("Custom domains · 1/3");
    const input = screen.getByPlaceholderText("app.example.com");
    await userEvent.type(input, "new.example.com{Enter}");
    await waitFor(() => expect(networkApi.addDomain).toHaveBeenCalledWith("new.example.com"));
  });

  it("removes a custom domain", async () => {
    renderWithRouter(<Network />);
    await screen.findByText("app.example.com");
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(networkApi.removeDomain).toHaveBeenCalledWith("app.example.com"));
  });

  it("hides the add form and warns when the peer quota is reached", async () => {
    const peers = Array.from({ length: 5 }, (_, i) =>
      fakePeer({ id: `p${i}`, device_name: `dev${i}`, address: `10.8.0.${i + 2}` }),
    );
    vi.mocked(networkApi.listPeers).mockResolvedValue(peers);
    renderWithRouter(<Network />);
    expect(await screen.findByText(/Peer limit reached/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("device name (e.g. macbook)")).not.toBeInTheDocument();
  });

  it("surfaces an error when adding a peer fails", async () => {
    const { ApiError } = await import("../api/client");
    vi.mocked(networkApi.createPeer).mockRejectedValueOnce(new ApiError("Limit hit", 409));
    renderWithRouter(<Network />);
    await screen.findByText("Peer · macbook");
    await userEvent.type(screen.getByPlaceholderText("device name (e.g. macbook)"), "phone{Enter}");
    expect(await screen.findByText("Limit hit")).toBeInTheDocument();
  });
});
