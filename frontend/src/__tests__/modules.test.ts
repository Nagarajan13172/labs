// Each api/*.ts module is a thin mapping over the shared `api` client. These
// tests mock the client and assert every method targets the right verb + path.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue(undefined),
    post: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    blob: vi.fn().mockResolvedValue(new Blob()),
    text: vi.fn().mockResolvedValue(""),
  },
  ApiError: class ApiError extends Error {},
}));

import { api } from "../api/client";
import { authApi } from "../api/auth";
import { labsApi } from "../api/labs";
import { networkApi } from "../api/network";
import { servicesApi } from "../api/services";
import { jobsApi } from "../api/jobs";
import { adminApi } from "../api/admin";
import { quotaApi } from "../api/quota";

beforeEach(() => vi.clearAllMocks());

describe("authApi", () => {
  it("signup posts to /auth/signup without auth", async () => {
    await authApi.signup({ email: "a@b.com", password: "p", phone: "1" });
    expect(api.post).toHaveBeenCalledWith(
      "/auth/signup",
      { email: "a@b.com", password: "p", phone: "1" },
      { auth: false },
    );
  });

  it("verifyEmail gets /auth/verify-email with the token query", async () => {
    await authApi.verifyEmail("tok");
    expect(api.get).toHaveBeenCalledWith("/auth/verify-email", { auth: false, query: { token: "tok" } });
  });

  it("signin posts credentials without auth", async () => {
    await authApi.signin("a@b.com", "pw");
    expect(api.post).toHaveBeenCalledWith(
      "/auth/signin",
      { email: "a@b.com", password: "pw" },
      { auth: false },
    );
  });

  it("logout posts the refresh token", async () => {
    await authApi.logout("ref");
    expect(api.post).toHaveBeenCalledWith("/auth/logout", { refresh_token: "ref" });
  });

  it("forgotPassword posts the email without auth", async () => {
    await authApi.forgotPassword("a@b.com");
    expect(api.post).toHaveBeenCalledWith("/auth/forgot-password", { email: "a@b.com" }, { auth: false });
  });

  it("me gets the current user", async () => {
    await authApi.me();
    expect(api.get).toHaveBeenCalledWith("/users/me");
  });
});

describe("labsApi", () => {
  it("maps each lab action to its endpoint", async () => {
    await labsApi.get();
    await labsApi.deploy();
    await labsApi.stop();
    await labsApi.start();
    await labsApi.destroy();
    await labsApi.credentials();
    await labsApi.stats();
    expect(api.get).toHaveBeenCalledWith("/labs");
    expect(api.post).toHaveBeenCalledWith("/labs/deploy");
    expect(api.post).toHaveBeenCalledWith("/labs/stop");
    expect(api.post).toHaveBeenCalledWith("/labs/start");
    expect(api.del).toHaveBeenCalledWith("/labs");
    expect(api.get).toHaveBeenCalledWith("/labs/credentials");
    expect(api.get).toHaveBeenCalledWith("/labs/stats");
  });
});

describe("networkApi", () => {
  it("lists, creates, and deletes peers", async () => {
    await networkApi.listPeers();
    await networkApi.createPeer("macbook");
    await networkApi.deletePeer("p1");
    expect(api.get).toHaveBeenCalledWith("/network/peers");
    expect(api.post).toHaveBeenCalledWith("/network/peers", { device_name: "macbook" });
    expect(api.del).toHaveBeenCalledWith("/network/peers/p1");
  });

  it("fetches a peer's config and QR via raw text/blob", async () => {
    await networkApi.peerConfig("p1");
    await networkApi.peerQrBlob("p1");
    expect(api.text).toHaveBeenCalledWith("/network/peers/p1/config");
    expect(api.blob).toHaveBeenCalledWith("/network/peers/p1/qr");
  });

  it("lists, adds, and removes domains", async () => {
    await networkApi.listDomains();
    await networkApi.addDomain("app.example.com");
    await networkApi.removeDomain("app.example.com");
    expect(api.get).toHaveBeenCalledWith("/network/domains");
    expect(api.post).toHaveBeenCalledWith("/network/domains", { domain_name: "app.example.com" });
    expect(api.del).toHaveBeenCalledWith("/network/domains/app.example.com");
  });
});

describe("servicesApi", () => {
  it("maps engine + database operations", async () => {
    await servicesApi.listEngines();
    await servicesApi.listDatabases();
    await servicesApi.createDatabase("mysql", "shop");
    await servicesApi.deleteDatabase("db1");
    expect(api.get).toHaveBeenCalledWith("/services/engines");
    expect(api.get).toHaveBeenCalledWith("/services/databases");
    expect(api.post).toHaveBeenCalledWith("/services/databases", { engine: "mysql", name: "shop" });
    expect(api.del).toHaveBeenCalledWith("/services/databases/db1");
  });
});

describe("jobsApi", () => {
  it("runs a sample job and polls its status", async () => {
    await jobsApi.runSample();
    await jobsApi.status("task-1");
    expect(api.post).toHaveBeenCalledWith("/jobs/sample");
    expect(api.get).toHaveBeenCalledWith("/jobs/task-1");
  });
});

describe("adminApi", () => {
  it("maps stats, users, role, and active operations", async () => {
    await adminApi.stats();
    await adminApi.listUsers();
    await adminApi.setRole("u1", "admin");
    await adminApi.setActive("u1", false);
    expect(api.get).toHaveBeenCalledWith("/admin/stats");
    expect(api.get).toHaveBeenCalledWith("/admin/users");
    expect(api.patch).toHaveBeenCalledWith("/admin/users/u1/role", { role: "admin" });
    expect(api.patch).toHaveBeenCalledWith("/admin/users/u1/active", { is_active: false });
  });
});

describe("quotaApi", () => {
  it("gets the quota", async () => {
    await quotaApi.get();
    expect(api.get).toHaveBeenCalledWith("/quota");
  });
});
