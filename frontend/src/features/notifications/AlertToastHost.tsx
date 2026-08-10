"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { AlertSeverity } from "./api";
import { useNotifications, toastKey } from "./NotificationProvider";
import type { AlertFrame } from "./socket";
import { SeverityDot } from "./SeverityDot";

const TTL_MS: Record<AlertSeverity, number | null> = {
  info: 6_000,
  warning: 10_000,
  critical: null,
};

const BORDERS: Record<AlertSeverity, string> = {
  info: "border-l-sky-500",
  warning: "border-l-amber-500",
  critical: "border-l-red-600",
};

function Toast({
  alert,
  toastId,
  dismiss,
}: {
  alert: AlertFrame;
  toastId: string;
  dismiss: (key: string) => void;
}) {
  const t = useTranslations("notifications");
  const ttl = TTL_MS[alert.severity];

  useEffect(() => {
    if (ttl === null) return;
    const timer = setTimeout(() => dismiss(toastId), ttl);
    return () => clearTimeout(timer);
  }, [ttl, toastId, dismiss]);

  return (
    <div
      className={`flex gap-2 rounded-md border border-border border-l-4 bg-background p-3 shadow-lg ${BORDERS[alert.severity]}`}
    >
      <SeverityDot severity={alert.severity} className="mt-1.5" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{alert.title}</p>
        <p className="text-xs opacity-70">{alert.body}</p>
      </div>

      <button
        type="button"
        onClick={() => dismiss(toastId)}
        aria-label={t("dismiss")}
        className="-mt-1 -mr-1 h-fit rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function AlertToastHost() {
  const { liveAlerts, dismiss } = useNotifications();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {liveAlerts.map((alert) => (
        <div key={toastKey(alert)} className="pointer-events-auto">
          <Toast alert={alert} toastId={toastKey(alert)} dismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
