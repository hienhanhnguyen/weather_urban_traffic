import { apiRequest } from "@/lib/api/client";

export interface PushConfig {
  enabled: boolean;
  publicKey: string;
}

export interface PushDevice {
  id: number;
  endpoint: string;
  userAgent: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  user_agent?: string;
}

export const PUSH_CONFIG_QUERY_KEY = ["push", "config"] as const;
export const PUSH_DEVICES_QUERY_KEY = ["push", "devices"] as const;

export const getPushConfig = () =>
  apiRequest<PushConfig>("/alerts/push-subscriptions/public-key");

export const listPushDevices = () =>
  apiRequest<{ subscriptions: PushDevice[] }>("/alerts/push-subscriptions").then(
    (response) => response.subscriptions,
  );

export const savePushDevice = (body: PushSubscriptionInput) =>
  apiRequest<{ subscription: PushDevice }>("/alerts/push-subscriptions", {
    method: "POST",
    body,
  }).then((response) => response.subscription);

export const deletePushDevice = (id: number) =>
  apiRequest<void>(`/alerts/push-subscriptions/${id}`, { method: "DELETE" });
