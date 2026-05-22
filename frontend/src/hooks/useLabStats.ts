import { useEffect, useRef, useState } from "react";
import { labsApi } from "../api/labs";
import type { LabStats } from "../api/types";

const KEEP = 24; // rolling samples to retain for sparklines

export interface LiveStats {
  stats: LabStats | null;
  cpu: number[]; // cpu % history
  mem: number[]; // mem % history
  net: number[]; // network rate history (bytes/s)
  netRate: number; // latest network rate (bytes/s)
}

// Polls GET /labs/stats every 3s while `enabled`, keeping a rolling history and
// deriving the network rate from successive cumulative byte counters.
export function useLabStats(enabled: boolean): LiveStats {
  const [stats, setStats] = useState<LabStats | null>(null);
  const [cpu, setCpu] = useState<number[]>([]);
  const [mem, setMem] = useState<number[]>([]);
  const [net, setNet] = useState<number[]>([]);
  const [netRate, setNetRate] = useState(0);
  const prev = useRef<{ total: number; ts: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      prev.current = null;
      return;
    }
    let stopped = false;
    let timer: number | undefined;

    const tick = async () => {
      try {
        const s = await labsApi.stats();
        if (stopped) return;
        setStats(s);
        if (s) {
          setCpu((h) => [...h, s.cpu_percent].slice(-KEEP));
          setMem((h) => [...h, s.mem_percent].slice(-KEEP));
          const now = Date.now();
          const total = s.rx_bytes + s.tx_bytes;
          if (prev.current) {
            const dt = (now - prev.current.ts) / 1000;
            const rate = dt > 0 ? Math.max((total - prev.current.total) / dt, 0) : 0;
            setNetRate(rate);
            setNet((h) => [...h, rate].slice(-KEEP));
          }
          prev.current = { total, ts: now };
        }
      } catch {
        /* transient; keep polling */
      }
      if (!stopped) timer = window.setTimeout(tick, 3000);
    };
    void tick();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled]);

  return { stats, cpu, mem, net, netRate };
}
