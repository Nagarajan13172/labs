import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { tokens, LOGOUT_EVENT } from "../api/tokens";
import { fakeUser, fakeTokenPair } from "./test-utils";

vi.mock("../api/auth", () => ({
  authApi: {
    me: vi.fn(),
    signin: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
    verifyEmail: vi.fn(),
    forgotPassword: vi.fn(),
  },
}));

import { authApi } from "../api/auth";

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  localStorage.clear();
  vi.mocked(authApi.me).mockResolvedValue(fakeUser());
  vi.mocked(authApi.signin).mockResolvedValue(fakeTokenPair());
  vi.mocked(authApi.logout).mockResolvedValue(null);
});

describe("AuthProvider bootstrap", () => {
  it("resolves to no user and stops loading when there is no token", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(authApi.me).not.toHaveBeenCalled();
  });

  it("loads the current user when a token is present", async () => {
    tokens.set("acc", "ref");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.username).toBe("alice"));
    expect(result.current.loading).toBe(false);
    expect(authApi.me).toHaveBeenCalled();
  });

  it("clears the user when bootstrap fails", async () => {
    tokens.set("acc", "ref");
    vi.mocked(authApi.me).mockRejectedValueOnce(new Error("401"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });
});

describe("AuthProvider actions", () => {
  it("signin stores tokens and sets the user", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signin("alice@gmail.com", "pw");
    });

    expect(authApi.signin).toHaveBeenCalledWith("alice@gmail.com", "pw");
    expect(tokens.access).toBe("access-123");
    expect(tokens.refresh).toBe("refresh-456");
    expect(result.current.user?.username).toBe("alice");
  });

  it("signout calls logout, clears tokens, and drops the user", async () => {
    tokens.set("acc", "ref");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.signout();
    });

    expect(authApi.logout).toHaveBeenCalledWith("ref");
    expect(tokens.access).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("signout is best-effort when the logout request fails", async () => {
    tokens.set("acc", "ref");
    vi.mocked(authApi.logout).mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.signout();
    });
    expect(result.current.user).toBeNull();
    expect(tokens.access).toBeNull();
  });

  it("refreshUser re-fetches the current user", async () => {
    tokens.set("acc", "ref");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    vi.mocked(authApi.me).mockResolvedValueOnce(fakeUser({ username: "renamed" }));
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(result.current.user?.username).toBe("renamed");
  });
});

describe("AuthProvider logout event", () => {
  it("drops the user when the API client signals a logout", async () => {
    tokens.set("acc", "ref");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => {
      window.dispatchEvent(new Event(LOGOUT_EVENT));
    });
    expect(result.current.user).toBeNull();
  });
});

describe("useAuth guard", () => {
  it("throws when used outside an AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/must be used within AuthProvider/);
    spy.mockRestore();
  });
});
