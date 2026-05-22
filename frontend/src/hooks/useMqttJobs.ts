import { useCallback, useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

export interface JobMessage {
  ts: string;
  message: string;
  status: boolean;
  is_finished: boolean;
  is_error: boolean;
}

export type MqttState = "connecting" | "connected" | "offline" | "error";

// Resolve the web-MQTT WebSocket URL. In dev we connect straight to RabbitMQ's
// web-MQTT listener on :15675; in prod set VITE_MQTT_URL to a wss endpoint.
function resolveUrl(): string {
  const env = import.meta.env.VITE_MQTT_URL as string | undefined;
  if (env) return env;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.hostname}:15675/ws`;
}

// Subscribes to the user's MQTT topic (`/topic/<username>`) and streams the
// worker's live `MqttMsg` progress (lab provisioning, jobs, etc.) in real time.
export function useMqttJobs(username: string | undefined) {
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [state, setState] = useState<MqttState>("connecting");
  const clientRef = useRef<mqtt.MqttClient | null>(null);

  useEffect(() => {
    if (!username) return;
    const topic = `/topic/${username}`;
    setState("connecting");

    const client = mqtt.connect(resolveUrl(), {
      username: (import.meta.env.VITE_MQTT_USERNAME as string) ?? "guest",
      password: (import.meta.env.VITE_MQTT_PASSWORD as string) ?? "guest",
      protocolVersion: 4, // MQTT 3.1.1 (broadly supported by RabbitMQ web-MQTT)
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 8000,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setState("connected");
      client.subscribe(topic);
    });
    client.on("reconnect", () => setState("connecting"));
    client.on("close", () => setState("offline"));
    client.on("error", () => setState("error"));
    client.on("message", (_topic, payload) => {
      try {
        const m = JSON.parse(payload.toString());
        setMessages((prev) =>
          [
            ...prev,
            {
              ts: new Date().toLocaleTimeString("en-GB", { hour12: false }),
              message: String(m.message ?? ""),
              status: Boolean(m.status),
              is_finished: Boolean(m.is_finished),
              is_error: Boolean(m.is_error),
            },
          ].slice(-200),
        );
      } catch {
        /* ignore non-JSON payloads */
      }
    });

    return () => {
      client.end(true);
      clientRef.current = null;
    };
  }, [username]);

  const clear = useCallback(() => setMessages([]), []);
  return { messages, state, clear };
}
