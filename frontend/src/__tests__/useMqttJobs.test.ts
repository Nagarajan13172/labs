import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMqttJobs } from "../hooks/useMqttJobs";

// A fake mqtt client that records its event handlers so tests can fire them.
const { mqttMock, fakeClient, handlers } = vi.hoisted(() => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const fakeClient = {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
    }),
    subscribe: vi.fn(),
    end: vi.fn(),
  };
  return { handlers, fakeClient, mqttMock: { connect: vi.fn(() => fakeClient) } };
});

vi.mock("mqtt", () => ({ default: mqttMock }));

const emit = (event: string, ...args: unknown[]) =>
  act(() => {
    handlers[event]?.(...args);
  });

beforeEach(() => {
  for (const k of Object.keys(handlers)) delete handlers[k];
});

describe("useMqttJobs", () => {
  it("does not connect without a username", () => {
    renderHook(() => useMqttJobs(undefined));
    expect(mqttMock.connect).not.toHaveBeenCalled();
  });

  it("connects to the web-MQTT URL and subscribes to the user topic", () => {
    renderHook(() => useMqttJobs("alice"));
    expect(mqttMock.connect).toHaveBeenCalledWith(
      "ws://localhost:15675/ws",
      expect.objectContaining({ protocolVersion: 4, clean: true }),
    );
    emit("connect");
    expect(fakeClient.subscribe).toHaveBeenCalledWith("/topic/alice");
  });

  it("reflects connection lifecycle in state", () => {
    const { result } = renderHook(() => useMqttJobs("alice"));
    expect(result.current.state).toBe("connecting");
    emit("connect");
    expect(result.current.state).toBe("connected");
    emit("close");
    expect(result.current.state).toBe("offline");
    emit("error");
    expect(result.current.state).toBe("error");
    emit("reconnect");
    expect(result.current.state).toBe("connecting");
  });

  it("appends parsed JSON progress messages", () => {
    const { result } = renderHook(() => useMqttJobs("alice"));
    emit(
      "message",
      "/topic/alice",
      Buffer.from(JSON.stringify({ message: "provisioning", status: true, is_finished: false, is_error: false })),
    );
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      message: "provisioning",
      status: true,
      is_finished: false,
      is_error: false,
    });
    expect(result.current.messages[0].ts).toBeTruthy();
  });

  it("ignores non-JSON payloads", () => {
    const { result } = renderHook(() => useMqttJobs("alice"));
    emit("message", "/topic/alice", Buffer.from("not-json{"));
    expect(result.current.messages).toHaveLength(0);
  });

  it("clears accumulated messages", () => {
    const { result } = renderHook(() => useMqttJobs("alice"));
    emit("message", "/topic/alice", Buffer.from(JSON.stringify({ message: "a" })));
    expect(result.current.messages).toHaveLength(1);
    act(() => result.current.clear());
    expect(result.current.messages).toHaveLength(0);
  });

  it("tears down the client on unmount", () => {
    const { unmount } = renderHook(() => useMqttJobs("alice"));
    unmount();
    expect(fakeClient.end).toHaveBeenCalledWith(true);
  });
});
