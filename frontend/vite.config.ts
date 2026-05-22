/// <reference types="vitest/config" />
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
  // Vitest: jsdom DOM, global expect/describe/it, and a setup file that wires up
  // jest-dom matchers and resets browser state between tests.
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    css: false,
    // Clear call history between tests but keep implementations defined in
    // module factories (vi.mock). Spies on globals are restored per-file.
    clearMocks: true,
    // All tests live in a single dedicated folder.
    include: ["src/__tests__/**/*.{test,spec}.{ts,tsx}"],
  },
});
