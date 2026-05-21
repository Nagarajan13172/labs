import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server runs on :3000 (matches the backend's default CORS origin) and
// proxies API + health paths to the FastAPI backend on :8000, so the browser
// makes same-origin requests and CORS never gets in the way.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/healthz": { target: "http://localhost:8000", changeOrigin: true },
      "/readyz": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
