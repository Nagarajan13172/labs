import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, fakeLab, fakePeer, fakeDatabase } from "./test-utils";

const { navigate, signout } = vi.hoisted(() => ({ navigate: vi.fn(), signout: vi.fn() }));

vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ signout }),
}));
vi.mock("../api/labs", () => ({ labsApi: { get: vi.fn() } }));
vi.mock("../api/network", () => ({ networkApi: { listPeers: vi.fn() } }));
vi.mock("../api/services", () => ({ servicesApi: { listDatabases: vi.fn() } }));

import { CommandPalette } from "../components/CommandPalette";
import { labsApi } from "../api/labs";
import { networkApi } from "../api/network";
import { servicesApi } from "../api/services";

beforeEach(() => {
  vi.mocked(labsApi.get).mockResolvedValue(fakeLab({ name: "alice-lab" }));
  vi.mocked(networkApi.listPeers).mockResolvedValue([fakePeer({ device_name: "macbook" })]);
  vi.mocked(servicesApi.listDatabases).mockResolvedValue([fakeDatabase({ db_name: "shop_db" })]);
});

const placeholder = "Search pages, labs, peers, databases…";

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    const { container } = renderWithRouter(<CommandPalette open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the base navigation items when open", async () => {
    renderWithRouter(<CommandPalette open onClose={() => {}} />);
    expect(await screen.findByPlaceholderText(placeholder)).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("focuses the search input on open", async () => {
    renderWithRouter(<CommandPalette open onClose={() => {}} />);
    const input = await screen.findByPlaceholderText(placeholder);
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("loads and lists live resources (lab, peers, databases)", async () => {
    renderWithRouter(<CommandPalette open onClose={() => {}} />);
    expect(await screen.findByText("alice-lab")).toBeInTheDocument();
    expect(screen.getByText("macbook")).toBeInTheDocument();
    expect(screen.getByText("shop_db")).toBeInTheDocument();
  });

  it("filters items by query", async () => {
    renderWithRouter(<CommandPalette open onClose={() => {}} />);
    const input = await screen.findByPlaceholderText(placeholder);
    await userEvent.type(input, "network");
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("shows an empty state for a non-matching query", async () => {
    renderWithRouter(<CommandPalette open onClose={() => {}} />);
    const input = await screen.findByPlaceholderText(placeholder);
    await userEvent.type(input, "zzzzz-nope");
    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  it("navigates and closes when Enter selects the highlighted item", async () => {
    const onClose = vi.fn();
    renderWithRouter(<CommandPalette open onClose={onClose} />);
    const input = await screen.findByPlaceholderText(placeholder);
    // Default highlight is the first item — Overview -> "/".
    await userEvent.type(input, "{Enter}");
    expect(navigate).toHaveBeenCalledWith("/");
    expect(onClose).toHaveBeenCalled();
  });

  it("moves the highlight with arrow keys before selecting", async () => {
    renderWithRouter(<CommandPalette open onClose={() => {}} />);
    const input = await screen.findByPlaceholderText(placeholder);
    // Down once -> second base item is "Labs" -> "/labs".
    await userEvent.type(input, "{ArrowDown}{Enter}");
    expect(navigate).toHaveBeenCalledWith("/labs");
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    renderWithRouter(<CommandPalette open onClose={onClose} />);
    const input = await screen.findByPlaceholderText(placeholder);
    await userEvent.type(input, "{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked but not the panel", async () => {
    const onClose = vi.fn();
    const { container } = renderWithRouter(<CommandPalette open onClose={onClose} />);
    await screen.findByPlaceholderText(placeholder);
    // Clicking the panel (input's ancestor) must not close.
    await userEvent.click(screen.getByPlaceholderText(placeholder));
    expect(onClose).not.toHaveBeenCalled();
    // The outermost element is the backdrop.
    await userEvent.click(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it("runs the sign-out action", async () => {
    const onClose = vi.fn();
    renderWithRouter(<CommandPalette open onClose={onClose} />);
    const input = await screen.findByPlaceholderText(placeholder);
    await userEvent.type(input, "sign out");
    await userEvent.click(screen.getByText("Sign out"));
    expect(signout).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
