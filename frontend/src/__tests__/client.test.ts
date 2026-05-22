import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "../api/client";
import { tokens, LOGOUT_EVENT } from "../api/tokens";
import { jsonResponse, nonJsonResponse, fakeTokenPair } from "./test-utils";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client — request shaping", () => {
  it("builds the URL under the default base and returns unwrapped data", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "lab1" }));
    const data = await api.get<{ id: string }>("/labs");
    expect(data).toEqual({ id: "lab1" });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/labs", expect.objectContaining({ method: "GET" }));
  });

  it("attaches the bearer token when authenticated", async () => {
    tokens.set("acc-token", "ref");
    fetchMock.mockResolvedValue(jsonResponse(null));
    await api.get("/users/me");
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.headers.Authorization).toBe("Bearer acc-token");
  });

  it("omits the bearer token when auth is disabled", async () => {
    tokens.set("acc-token", "ref");
    fetchMock.mockResolvedValue(jsonResponse(null));
    await api.post("/auth/signin", { email: "a@b.com" }, { auth: false });
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it("serialises the body and sets the JSON content type on POST", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await api.post("/jobs/sample", { x: 1 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/jobs/sample");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.body).toBe(JSON.stringify({ x: 1 }));
  });

  it("uses PATCH and DELETE verbs", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await api.patch("/admin/users/1/role", { role: "admin" });
    await api.del("/labs");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });

  it("appends defined query params and skips undefined ones", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    await api.get("/auth/verify-email", { query: { token: "abc", empty: undefined, n: 3 } });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/verify-email?token=abc&n=3");
  });

  it("returns null when the envelope data is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));
    expect(await api.get("/labs")).toBeNull();
  });
});

describe("api client — error handling", () => {
  it("throws an ApiError carrying the envelope message and status", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, { ok: false, status: 400, message: "Bad input" }));
    await expect(api.get("/labs")).rejects.toMatchObject({ message: "Bad input", status: 400 });
    await expect(api.get("/labs")).rejects.toBeInstanceOf(ApiError);
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(nonJsonResponse({ ok: false, status: 500 }));
    await expect(api.get("/labs")).rejects.toMatchObject({
      message: "Request failed (500)",
      status: 500,
    });
  });
});

describe("api client — 401 refresh flow", () => {
  it("refreshes the token once and retries the original request", async () => {
    tokens.set("old-acc", "ref");
    let labCalls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(
          jsonResponse(fakeTokenPair({ access_token: "new-acc", refresh_token: "new-ref" })),
        );
      }
      labCalls += 1;
      return Promise.resolve(
        labCalls === 1
          ? jsonResponse(null, { ok: false, status: 401, message: "expired" })
          : jsonResponse({ id: "lab1" }),
      );
    });

    const data = await api.get<{ id: string }>("/labs");
    expect(data).toEqual({ id: "lab1" });
    // Tokens were rotated.
    expect(tokens.access).toBe("new-acc");
    expect(tokens.refresh).toBe("new-ref");
    // The retry carried the refreshed bearer token.
    const retried = fetchMock.mock.calls.find(
      (c) => c[0].endsWith("/labs") && c[1].headers.Authorization === "Bearer new-acc",
    );
    expect(retried).toBeTruthy();
  });

  it("clears tokens and signals logout when the refresh fails", async () => {
    tokens.set("old-acc", "ref");
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith("/auth/refresh")
          ? jsonResponse(null, { ok: false, status: 401 })
          : jsonResponse(null, { ok: false, status: 401, message: "expired" }),
      ),
    );
    const onLogout = vi.fn();
    window.addEventListener(LOGOUT_EVENT, onLogout);

    await expect(api.get("/labs")).rejects.toMatchObject({ status: 401 });
    expect(tokens.access).toBeNull();
    expect(tokens.refresh).toBeNull();
    expect(onLogout).toHaveBeenCalled();
    window.removeEventListener(LOGOUT_EVENT, onLogout);
  });

  it("does not attempt a refresh when there is no refresh token", async () => {
    tokens.set("acc"); // access only, no refresh
    fetchMock.mockResolvedValue(jsonResponse(null, { ok: false, status: 401, message: "expired" }));
    await expect(api.get("/labs")).rejects.toMatchObject({ status: 401 });
    // Only the original request — no /auth/refresh call.
    expect(fetchMock.mock.calls.some((c) => c[0].endsWith("/auth/refresh"))).toBe(false);
  });
});

describe("api client — raw blob/text", () => {
  it("returns a Blob on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse("ignored"));
    const blob = await api.blob("/network/peers/1/qr");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("returns text on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "[Interface]\nPrivateKey=...",
    } as unknown as Response);
    const text = await api.text("/network/peers/1/config");
    expect(text).toContain("[Interface]");
  });

  it("throws an ApiError from the JSON envelope when a raw fetch fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, { ok: false, status: 404, message: "not found" }));
    await expect(api.blob("/network/peers/1/qr")).rejects.toMatchObject({
      message: "not found",
      status: 404,
    });
  });
});
