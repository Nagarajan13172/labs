import { describe, it, expect, vi, beforeEach } from "vitest";
import { tokens, LOGOUT_EVENT } from "../api/tokens";

beforeEach(() => localStorage.clear());

describe("tokens store", () => {
  it("returns null when nothing is stored", () => {
    expect(tokens.access).toBeNull();
    expect(tokens.refresh).toBeNull();
  });

  it("stores and reads the access + refresh tokens", () => {
    tokens.set("acc", "ref");
    expect(tokens.access).toBe("acc");
    expect(tokens.refresh).toBe("ref");
    expect(localStorage.getItem("ys_access")).toBe("acc");
    expect(localStorage.getItem("ys_refresh")).toBe("ref");
  });

  it("leaves the refresh token untouched when set is called without one", () => {
    tokens.set("acc1", "ref1");
    tokens.set("acc2");
    expect(tokens.access).toBe("acc2");
    expect(tokens.refresh).toBe("ref1");
  });

  it("clears both tokens", () => {
    tokens.set("acc", "ref");
    tokens.clear();
    expect(tokens.access).toBeNull();
    expect(tokens.refresh).toBeNull();
  });

  it("dispatches the logout event", () => {
    const handler = vi.fn();
    window.addEventListener(LOGOUT_EVENT, handler);
    tokens.signalLogout();
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener(LOGOUT_EVENT, handler);
  });
});
