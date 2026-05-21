// Tiny typed fetch client: unwraps the {message,status,data} envelope, attaches
// the bearer token, and transparently refreshes once on a 401 before retrying.
// Also exposes raw blob/text fetches (for the WireGuard QR png and .conf).
import type { Envelope, TokenPair } from "./types";
import { tokens } from "./tokens";

const BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOpts {
  body?: unknown;
  auth?: boolean; // attach bearer token (default true)
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOpts["query"]): string {
  const url = `${BASE}${path}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

async function refreshTokens(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  try {
    const res = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const env = (await res.json()) as Envelope<TokenPair>;
    if (env.data) {
      tokens.set(env.data.access_token, env.data.refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Performs the request, attaching auth and refreshing once on 401. Returns the
// raw Response; callers decide how to read the body.
async function authedFetch(
  method: string,
  path: string,
  opts: RequestOpts,
  isRetry = false,
): Promise<Response> {
  const auth = opts.auth ?? true;
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokens.access) headers["Authorization"] = `Bearer ${tokens.access}`;

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && auth && !isRetry && tokens.refresh) {
    if (await refreshTokens()) return authedFetch(method, path, opts, true);
    tokens.clear();
    tokens.signalLogout();
  }
  return res;
}

async function errorFrom(res: Response): Promise<ApiError> {
  try {
    const env = (await res.json()) as Envelope<unknown>;
    return new ApiError(env.message ?? `Request failed (${res.status})`, res.status);
  } catch {
    return new ApiError(`Request failed (${res.status})`, res.status);
  }
}

async function jsonRequest<T>(method: string, path: string, opts: RequestOpts): Promise<T> {
  const res = await authedFetch(method, path, opts);
  let env: Envelope<T> | null = null;
  try {
    env = (await res.json()) as Envelope<T>;
  } catch {
    /* non-JSON; handled below */
  }
  if (!res.ok) throw new ApiError(env?.message ?? `Request failed (${res.status})`, res.status);
  return (env?.data as T) ?? (null as T);
}

export const api = {
  get: <T>(path: string, opts: RequestOpts = {}) => jsonRequest<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts: RequestOpts = {}) =>
    jsonRequest<T>("POST", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts: RequestOpts = {}) =>
    jsonRequest<T>("PATCH", path, { ...opts, body }),
  del: <T>(path: string, opts: RequestOpts = {}) => jsonRequest<T>("DELETE", path, opts),

  // Raw bodies (success returns the asset; errors still return the JSON envelope).
  async blob(path: string): Promise<Blob> {
    const res = await authedFetch("GET", path, {});
    if (!res.ok) throw await errorFrom(res);
    return res.blob();
  },
  async text(path: string): Promise<string> {
    const res = await authedFetch("GET", path, {});
    if (!res.ok) throw await errorFrom(res);
    return res.text();
  },
};
