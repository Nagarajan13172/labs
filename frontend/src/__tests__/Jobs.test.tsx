import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, fakeUser } from "./test-utils";
import type { JobMessage, MqttState } from "../hooks/useMqttJobs";

vi.mock("../components/Nav", () => ({ Nav: () => <nav data-testid="nav" /> }));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ user: fakeUser({ username: "alice" }) }) }));
vi.mock("../api/jobs", () => ({ jobsApi: { runSample: vi.fn(), status: vi.fn() } }));

const { mqtt } = vi.hoisted(() => ({
  mqtt: {
    current: {
      messages: [] as JobMessage[],
      state: "connected" as MqttState,
      clear: vi.fn(),
    },
  },
}));
vi.mock("../hooks/useMqttJobs", () => ({ useMqttJobs: () => mqtt.current }));

import { Jobs } from "../pages/Jobs";
import { jobsApi } from "../api/jobs";

const msg = (over: Partial<JobMessage> = {}): JobMessage => ({
  ts: "12:00:00",
  message: "working",
  status: true,
  is_finished: false,
  is_error: false,
  ...over,
});

beforeEach(() => {
  mqtt.current = { messages: [], state: "connected", clear: vi.fn() };
  vi.mocked(jobsApi.runSample).mockResolvedValue({ task_id: "t1", topic: "/topic/alice" });
});

describe("Jobs", () => {
  it("shows the live connection badge", () => {
    renderWithRouter(<Jobs />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders an empty waiting state when connected with no events", () => {
    renderWithRouter(<Jobs />);
    expect(screen.getByText(/Waiting for activity/)).toBeInTheDocument();
  });

  it("shows the offline hint when the stream is offline", () => {
    mqtt.current = { messages: [], state: "offline", clear: vi.fn() };
    renderWithRouter(<Jobs />);
    expect(screen.getByText(/Live stream offline/)).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("renders streamed messages and the event count", () => {
    mqtt.current = {
      messages: [msg({ message: "step one" }), msg({ message: "all done", is_finished: true })],
      state: "connected",
      clear: vi.fn(),
    };
    renderWithRouter(<Jobs />);
    expect(screen.getByText("step one")).toBeInTheDocument();
    expect(screen.getByText("all done")).toBeInTheDocument();
    expect(screen.getByText("2 events")).toBeInTheDocument();
    expect(screen.getByText("● done")).toBeInTheDocument();
  });

  it("enqueues a sample job", async () => {
    renderWithRouter(<Jobs />);
    await userEvent.click(screen.getByRole("button", { name: /Run sample job/ }));
    await waitFor(() => expect(jobsApi.runSample).toHaveBeenCalled());
  });

  it("clears the event log", async () => {
    const clear = vi.fn();
    mqtt.current = { messages: [msg()], state: "connected", clear };
    renderWithRouter(<Jobs />);
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(clear).toHaveBeenCalled();
  });

  it("surfaces an error when enqueue fails", async () => {
    const { ApiError } = await import("../api/client");
    vi.mocked(jobsApi.runSample).mockRejectedValueOnce(new ApiError("Broker down", 503));
    renderWithRouter(<Jobs />);
    await userEvent.click(screen.getByRole("button", { name: /Run sample job/ }));
    expect(await screen.findByText("Broker down")).toBeInTheDocument();
  });
});
