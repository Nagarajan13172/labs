import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, fakeDatabase } from "./test-utils";
import type { EngineInfo } from "../api/services";

vi.mock("../components/Nav", () => ({ Nav: () => <nav data-testid="nav" /> }));
vi.mock("../api/services", () => ({
  servicesApi: {
    listEngines: vi.fn(),
    listDatabases: vi.fn(),
    createDatabase: vi.fn(),
    deleteDatabase: vi.fn(),
  },
}));

import { Databases } from "../pages/Databases";
import { servicesApi } from "../api/services";

const engines: EngineInfo[] = [
  { engine: "mysql", host: "mysql.local", port: 3306 },
  { engine: "mariadb", host: "maria.local", port: 3307 },
];

beforeEach(() => {
  vi.mocked(servicesApi.listEngines).mockResolvedValue(engines);
  vi.mocked(servicesApi.listDatabases).mockResolvedValue([
    fakeDatabase({ db_name: "shop_db", username: "shop_user", password: "dbpass123" }),
  ]);
  vi.mocked(servicesApi.createDatabase).mockResolvedValue(
    fakeDatabase({ id: "db2", db_name: "blog_db" }),
  );
  vi.mocked(servicesApi.deleteDatabase).mockResolvedValue(null);
});

describe("Databases", () => {
  it("renders engine cards and the database list", async () => {
    renderWithRouter(<Databases />);
    // "shop_db" appears in both the list row and the detail panel.
    expect(await screen.findByText("Detail · shop_db")).toBeInTheDocument();
    expect(screen.getAllByText("shop_db").length).toBeGreaterThan(0);
    expect(screen.getByText("Your databases · 1")).toBeInTheDocument();
    // Engine cards show host:port.
    expect(screen.getByText("mysql.local:3306")).toBeInTheDocument();
    expect(screen.getByText("user · shop_user")).toBeInTheDocument();
  });

  it("masks the password in the connection URI until revealed", async () => {
    renderWithRouter(<Databases />);
    await screen.findByText("Detail · shop_db");
    // Masked form replaces the password with bullets.
    expect(screen.queryByText(/dbpass123/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reveal password" }));
    // Revealed in both the connection URI and the password field.
    expect((await screen.findAllByText(/dbpass123/)).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });

  it("copies the connection URI", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    renderWithRouter(<Databases />);
    await screen.findByText("Detail · shop_db");
    await userEvent.click(screen.getByRole("button", { name: "Copy URI" }));
    expect(writeText).toHaveBeenCalledWith(
      "mysql://shop_user:dbpass123@db.local:3306/shop_db",
    );
  });

  it("creates a database", async () => {
    renderWithRouter(<Databases />);
    await screen.findByText("Detail · shop_db");
    await userEvent.type(screen.getByPlaceholderText("name (e.g. shop)"), "  blog  ");
    await userEvent.click(screen.getByRole("button", { name: /New database/ }));
    await waitFor(() => expect(servicesApi.createDatabase).toHaveBeenCalledWith("mysql", "blog"));
    expect(await screen.findByText("blog_db")).toBeInTheDocument();
  });

  it("drops a database after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithRouter(<Databases />);
    await screen.findByText("Detail · shop_db");
    await userEvent.click(screen.getByRole("button", { name: /Drop database/ }));
    await waitFor(() => expect(servicesApi.deleteDatabase).toHaveBeenCalledWith("db1"));
    confirmSpy.mockRestore();
  });

  it("does not drop when confirmation is dismissed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithRouter(<Databases />);
    await screen.findByText("Detail · shop_db");
    await userEvent.click(screen.getByRole("button", { name: /Drop database/ }));
    expect(servicesApi.deleteDatabase).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("shows the empty state when there are no databases", async () => {
    vi.mocked(servicesApi.listDatabases).mockResolvedValue([]);
    renderWithRouter(<Databases />);
    expect(await screen.findByText("No databases — create one above.")).toBeInTheDocument();
  });

  it("surfaces an error when creation fails", async () => {
    const { ApiError } = await import("../api/client");
    vi.mocked(servicesApi.createDatabase).mockRejectedValueOnce(new ApiError("Name taken", 409));
    renderWithRouter(<Databases />);
    await screen.findByText("Detail · shop_db");
    await userEvent.type(screen.getByPlaceholderText("name (e.g. shop)"), "blog");
    await userEvent.click(screen.getByRole("button", { name: /New database/ }));
    expect(await screen.findByText("Name taken")).toBeInTheDocument();
  });
});
