// JWT token store (localStorage). Shared by the API client and AuthContext.
const ACCESS = "ys_access";
const REFRESH = "ys_refresh";

// Dispatched when a refresh fails — AuthContext listens and signs the user out.
export const LOGOUT_EVENT = "ys-auth-logout";

export const tokens = {
  get access(): string | null {
    return localStorage.getItem(ACCESS);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
  signalLogout() {
    window.dispatchEvent(new Event(LOGOUT_EVENT));
  },
};
