# Youngstorage Labs — Frontend

The web client for the Youngstorage Labs platform. **Vite + React + TypeScript**,
implementing the **V4 · Atmos** design direction — a refined, Vercel-style cloud
aesthetic: **Geist + Geist Mono**, warm-black surfaces (`#0a0a0a`), hairline
borders, generous whitespace, electric-blue↔violet gradient accents, and softly
glowing dot-status badges. Dark theme.

## Scope

Wired live to the FastAPI backend:

- **Auth** — sign in, sign up, email verification (`/auth/*`, `/users/me`)
- **Dashboard** — live overview (your lab, peers, databases)
- **Labs** — deploy / start / stop / redeploy / destroy + reveal credentials,
  with provisioning live-poll
- **Network** — WireGuard peers (add device, **QR + `.conf` download**, revoke) and
  custom domains (add / list / remove)
- **Databases** — engines, create (engine + name), connection URI + reveal/copy, drop
- **Jobs** — run the sample Celery task and watch it stream `STARTED → SUCCESS`

`ADMIN` is a scaffolded nav placeholder. Live MQTT streaming over WebSocket
(RabbitMQ web-MQTT) is a planned enhancement for the Jobs view.

## Run

The backend must be running (`cd ../backend && make up`). Then:

```bash
npm install
npm run dev          # http://localhost:3000
```

The dev server proxies `/api`, `/healthz`, `/readyz` to `http://localhost:8000`
(see `vite.config.ts`), so the browser talks to the backend same-origin — no CORS
setup needed. Port 3000 also matches the backend's default `CORS_ORIGINS`.

> Sign-up sends a verification email. In dev, open **MailHog** at
> http://localhost:8025 to grab the verification link.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Vite dev server on :3000 |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

```
src/
  api/        typed client (envelope unwrap + token refresh) + endpoint modules
  auth/       AuthContext (token storage, current user) + ProtectedRoute
  components/ V3 UI kit: Page, AppBar, Mark, Tag, Button, Field, Panel, Metric, AuthLayout
  pages/      SignIn, SignUp, VerifyEmail, Dashboard, Labs, Placeholder
  theme/v3.ts design tokens
```

## Production API base

For a deployed build, set `VITE_API_BASE` (e.g. `https://api.example.com/api/v1`)
instead of relying on the dev proxy.
