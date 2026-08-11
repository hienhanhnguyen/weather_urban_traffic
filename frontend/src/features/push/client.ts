import type { PushSubscriptionInput } from "./api";

export const SW_PATH = "/sw.js";

export type PushFailure =
  | "unsupported"
  | "unavailable"
  | "denied"
  | "dismissed"
  | "failed";

export class PushError extends Error {
  readonly reason: PushFailure;

  constructor(reason: PushFailure) {
    super(reason);
    this.name = "PushError";
    this.reason = reason;
  }
}

export interface LocalPushState {
  supported: boolean;
  permission: NotificationPermission;
  endpoint: string | null;
}
export function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");

  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
export function sameServerKey(
  existing: ArrayBuffer | null,
  wanted: Uint8Array,
): boolean {
  if (existing === null) return false;

  const bytes = new Uint8Array(existing);
  if (bytes.length !== wanted.length) return false;
  return bytes.every((byte, index) => byte === wanted[index]);
}

export function subscriptionInput(
  json: PushSubscriptionJSON,
  userAgent?: string,
): PushSubscriptionInput {
  const { endpoint, keys } = json;

  if (!endpoint || !keys?.p256dh || !keys?.auth) throw new PushError("failed");

  return {
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
    ...(userAgent && { user_agent: userAgent.slice(0, 255) }),
  };
}

export const pushSupported = (): boolean =>
  typeof window !== "undefined" &&
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const registration = () => navigator.serviceWorker.getRegistration(SW_PATH);

export async function readLocalPushState(): Promise<LocalPushState> {
  if (!pushSupported()) {
    return { supported: false, permission: "denied", endpoint: null };
  }

  const existing = await registration();
  const subscription = (await existing?.pushManager.getSubscription()) ?? null;

  return {
    supported: true,
    permission: Notification.permission,
    endpoint: subscription?.endpoint ?? null,
  };
}

async function subscribeWithKey(publicKey: string): Promise<PushSubscription> {
  const key = urlBase64ToUint8Array(publicKey);

  const worker = await navigator.serviceWorker.register(SW_PATH, {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;

  const existing = await worker.pushManager.getSubscription();
  if (existing) {
    if (sameServerKey(existing.options.applicationServerKey, key)) {
      return existing;
    }
    await existing.unsubscribe();
  }

  return worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
}

export async function subscribeThisDevice(
  publicKey: string,
): Promise<PushSubscriptionInput> {
  if (!pushSupported()) throw new PushError("unsupported");
  if (publicKey === "") throw new PushError("unavailable");

  const permission = await Notification.requestPermission();
  if (permission === "denied") throw new PushError("denied");
  if (permission !== "granted") throw new PushError("dismissed");

  try {
    const subscription = await subscribeWithKey(publicKey);
    return subscriptionInput(subscription.toJSON(), navigator.userAgent);
  } catch (err) {
    if (err instanceof PushError) throw err;
    throw new PushError("failed");
  }
}

export async function unsubscribeThisDevice(): Promise<string | null> {
  if (!pushSupported()) return null;

  const worker = await registration();
  const subscription = await worker?.pushManager.getSubscription();
  if (!subscription) return null;

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}
