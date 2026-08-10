import { API_BASE_URL } from "@/lib/api/http";
import type { AlertSeverity } from "./api";

export interface AlertFrame {
  type: "alert";
  ruleId: number;
  locationId: number | null;
  severity: AlertSeverity;
  metric: string;
  value: number;
  unit: string;
  title: string;
  body: string;
  issuedAt: string;
}

export type SocketFrame =
  | AlertFrame
  | { type: "connected" }
  | { type: string; [key: string]: unknown };

export const isAlertFrame = (frame: SocketFrame): frame is AlertFrame =>
  frame.type === "alert";

export function parseFrame(data: unknown): SocketFrame | null {
  if (typeof data !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { type } = parsed as { type?: unknown };
    return typeof type === "string" ? (parsed as SocketFrame) : null;
  } catch {
    return null;
  }
}

export function notificationsSocketUrl(): string {
  const origin = API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  return `${origin.replace(/^http/, "ws")}/ws/notifications`;
}

export const socketProtocols = (accessToken: string): string[] => [
  "bearer",
  accessToken,
];
