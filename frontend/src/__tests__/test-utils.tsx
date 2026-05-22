// Shared helpers for the test suite: a router-aware render, typed data
// fixtures, and small fetch Response factories for mocking the API client.
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";
import type {
  Lab,
  LabCredentials,
  LabStats,
  ManagedDatabase,
  PeerStatus,
  TokenPair,
  User,
} from "../api/types";

// ---- render helpers ---------------------------------------------------------

interface RouterRenderOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
}

// Render a tree inside a MemoryRouter at the given route.
export function renderWithRouter(ui: ReactElement, opts: RouterRenderOptions = {}) {
  const { route = "/", ...rest } = opts;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );
  return render(ui, { wrapper: Wrapper, ...rest });
}

// ---- data fixtures ----------------------------------------------------------

export const fakeUser = (over: Partial<User> = {}): User => ({
  id: "u1",
  email: "alice@gmail.com",
  username: "alice",
  phone: "1234567890",
  role: "user",
  is_verified: true,
  is_active: true,
  created_at: "2024-01-01T00:00:00.000Z",
  ...over,
});

export const fakeTokenPair = (over: Partial<TokenPair> = {}): TokenPair => ({
  access_token: "access-123",
  refresh_token: "refresh-456",
  token_type: "bearer",
  ...over,
});

export const fakeLab = (over: Partial<Lab> = {}): Lab => ({
  id: "lab1",
  name: "alice-lab",
  status: "running",
  status_message: null,
  internal_ip: "10.0.0.2",
  host_port: 8443,
  image: "code-server",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  ...over,
});

export const fakeLabCredentials = (over: Partial<LabCredentials> = {}): LabCredentials => ({
  code_server_password: "s3cr3t-pass",
  host_port: 8443,
  ...over,
});

export const fakeLabStats = (over: Partial<LabStats> = {}): LabStats => ({
  cpu_percent: 12,
  mem_used: 256 * 1024 * 1024,
  mem_limit: 1024 * 1024 * 1024,
  mem_percent: 25,
  rx_bytes: 1000,
  tx_bytes: 2000,
  ...over,
});

export const fakePeer = (over: Partial<PeerStatus> = {}): PeerStatus => ({
  id: "peer1",
  device_name: "macbook",
  device_type: "laptop",
  address: "10.8.0.2",
  public_key: "PUBKEY==",
  endpoint: null,
  latest_handshake: 0,
  rx_bytes: 0,
  tx_bytes: 0,
  created_at: "2024-01-01T00:00:00.000Z",
  ...over,
});

export const fakeDatabase = (over: Partial<ManagedDatabase> = {}): ManagedDatabase => ({
  id: "db1",
  engine: "mysql",
  name: "shop",
  db_name: "shop_db",
  username: "shop_user",
  password: "dbpass123",
  host: "db.local",
  port: 3306,
  connection_uri: "mysql://shop_user:dbpass123@db.local:3306/shop_db",
  created_at: "2024-01-01T00:00:00.000Z",
  ...over,
});

// ---- fetch Response factories ----------------------------------------------

// A JSON envelope Response, as the API client expects ({message,status,data}).
export function jsonResponse<T>(
  data: T,
  { ok = true, status = 200, message = "ok" }: { ok?: boolean; status?: number; message?: string } = {},
): Response {
  return {
    ok,
    status,
    json: async () => ({ message, status: ok, data }),
    text: async () => JSON.stringify({ message, status: ok, data }),
    blob: async () => new Blob([JSON.stringify({ message, status: ok, data })]),
  } as unknown as Response;
}

// A Response whose body is not valid JSON (exercises the client's catch paths).
export function nonJsonResponse({ ok = true, status = 200, body = "raw-body" } = {}): Response {
  return {
    ok,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
    text: async () => body,
    blob: async () => new Blob([body]),
  } as unknown as Response;
}
