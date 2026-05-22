import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLabStats } from "../hooks/useLabStats";
import { fakeLabStats } from "./test-utils";

vi.mock("../api/labs", () => ({ labsApi: { stats: vi.fn() } }));
import { labsApi } from "../api/labs";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useLabStats", () => {
  it("does not poll while disabled", async () => {
    const { result } = renderHook(() => useLabStats(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(labsApi.stats).not.toHaveBeenCalled();
    expect(result.current.stats).toBeNull();
    expect(result.current.cpu).toEqual([]);
  });

  it("polls immediately and records the first sample", async () => {
    vi.mocked(labsApi.stats).mockResolvedValue(
      fakeLabStats({ cpu_percent: 10, mem_percent: 20, rx_bytes: 100, tx_bytes: 200 }),
    );
    const { result } = renderHook(() => useLabStats(true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(labsApi.stats).toHaveBeenCalledTimes(1);
    expect(result.current.stats?.cpu_percent).toBe(10);
    expect(result.current.cpu).toEqual([10]);
    expect(result.current.mem).toEqual([20]);
    // The network rate needs two samples to derive a delta.
    expect(result.current.net).toEqual([]);
    expect(result.current.netRate).toBe(0);
  });

  it("derives the network rate from successive byte counters", async () => {
    vi.mocked(labsApi.stats)
      .mockResolvedValueOnce(fakeLabStats({ rx_bytes: 100, tx_bytes: 200 })) // total 300
      .mockResolvedValueOnce(fakeLabStats({ rx_bytes: 1300, tx_bytes: 200 })); // total 1500
    const { result } = renderHook(() => useLabStats(true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1); // first sample
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000); // second sample, 3s later
    });

    expect(labsApi.stats).toHaveBeenCalledTimes(2);
    // (1500 - 300) bytes over 3s = 400 bytes/s.
    expect(result.current.netRate).toBeCloseTo(400, 0);
    expect(result.current.net).toHaveLength(1);
    expect(result.current.cpu).toHaveLength(2);
  });

  it("keeps polling through a transient error", async () => {
    vi.mocked(labsApi.stats)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(fakeLabStats({ cpu_percent: 42 }));
    const { result } = renderHook(() => useLabStats(true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1); // first tick rejects
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000); // recovers on the next tick
    });

    expect(result.current.stats?.cpu_percent).toBe(42);
  });

  it("stops polling after unmount", async () => {
    vi.mocked(labsApi.stats).mockResolvedValue(fakeLabStats());
    const { unmount } = renderHook(() => useLabStats(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(labsApi.stats).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(labsApi.stats).toHaveBeenCalledTimes(1);
  });
});
