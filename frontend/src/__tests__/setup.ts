// Global Vitest setup: jest-dom matchers + a clean browser-ish environment
// before every test (localStorage, mocks, and a stubbed clipboard/fetch).
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees and clear the DOM between tests.
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});

// jsdom doesn't implement these; components/tests touch them.
if (!("clipboard" in navigator)) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
}

// matchMedia is referenced by some libraries; provide a no-op shim.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// URL object-url helpers used by the Network page (QR blob + .conf download).
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock");
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}
