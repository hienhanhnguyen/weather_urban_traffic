"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTokenPair } from "@/lib/auth/session";
import { ALERT_EVENTS_QUERY_KEY } from "./api";
import {
  isAlertFrame,
  notificationsSocketUrl,
  parseFrame,
  socketProtocols,
  type AlertFrame,
} from "./socket";

export type ConnectionStatus = "connecting" | "open" | "reconnecting";

export const toastKey = (alert: AlertFrame) =>
  `${alert.ruleId}|${alert.issuedAt}`;

const MAX_TOASTS = 3;

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

function reconnectDelay(attempt: number): number {
  const capped = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
  return capped / 2 + Math.random() * (capped / 2);
}

interface NotificationsValue {
  liveAlerts: AlertFrame[];
  dismiss: (key: string) => void;
  status: ConnectionStatus;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const tokens = useTokenPair();
  const accessToken = tokens?.accessToken ?? null;

  const [liveAlerts, setLiveAlerts] = useState<AlertFrame[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const dismiss = useCallback((key: string) => {
    setLiveAlerts((current) =>
      current.filter((alert) => toastKey(alert) !== key),
    );
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    let disposed = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const connect = () => {
      if (disposed) return;

      socket = new WebSocket(
        notificationsSocketUrl(),
        socketProtocols(accessToken),
      );

      socket.onopen = () => {
        attempt = 0;
        setStatus("open");
        void queryClient.invalidateQueries({
          queryKey: ALERT_EVENTS_QUERY_KEY,
        });
      };

      socket.onmessage = (event: MessageEvent) => {
        const frame = parseFrame(event.data);
        if (!frame || !isAlertFrame(frame)) return;

        setLiveAlerts((current) => [...current, frame].slice(-MAX_TOASTS));
        void queryClient.invalidateQueries({
          queryKey: ALERT_EVENTS_QUERY_KEY,
        });
      };

      socket.onclose = () => {
        if (disposed) return;
        setStatus("reconnecting");
        retryTimer = setTimeout(connect, reconnectDelay(attempt));
        attempt += 1;
      };
    };

    const wakeUp = () => {
      if (disposed) return;
      if (
        socket?.readyState === WebSocket.OPEN ||
        socket?.readyState === WebSocket.CONNECTING
      ) {
        return;
      }
      clearTimeout(retryTimer);
      attempt = 0;
      connect();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") wakeUp();
    };

    connect();
    window.addEventListener("online", wakeUp);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      window.removeEventListener("online", wakeUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socket?.close(1000, "client navigating away");
    };
  }, [accessToken, queryClient]);

  return (
    <NotificationsContext.Provider value={{ liveAlerts, dismiss, status }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsValue {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error(
      "useNotifications must be used inside <NotificationProvider>",
    );
  }
  return value;
}
