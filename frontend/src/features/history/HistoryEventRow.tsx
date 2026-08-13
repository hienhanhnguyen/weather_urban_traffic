"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { useRelativeTime } from "@/i18n/relative-time";
import { SeverityDot } from "@/features/notifications/SeverityDot";
import type { AlertEvent } from "@/features/notifications/api";

export interface HistoryEventRowProps {
  event: AlertEvent;
  onMarkRead: (id: number) => void;
  disabled: boolean;
}

export function HistoryEventRow({
  event,
  onMarkRead,
  disabled,
}: HistoryEventRowProps) {
  const t = useTranslations("history");
  const format = useFormatter();
  const relativeTime = useRelativeTime();

  const createdAt = new Date(event.createdAt);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <SeverityDot severity={event.severity} className="mt-1.5" />

      <div className="min-w-0 flex-1">
        <p
          className={
            "text-sm " + (event.isRead ? "opacity-70" : "font-semibold")
          }
        >
          {event.title}
        </p>

        {event.body && <p className="text-sm opacity-70">{event.body}</p>}

        <p className="text-xs opacity-50">
          <time dateTime={event.createdAt}>
            {format.dateTime(createdAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          {" · "}
          {relativeTime(createdAt)}
        </p>
      </div>

      {event.isRead ? (
        <span className="shrink-0 text-xs opacity-50">{t("status.read")}</span>
      ) : (
        <button
          type="button"
          onClick={() => onMarkRead(event.id)}
          disabled={disabled}
          aria-label={t("markOneRead", { title: event.title })}
          className="shrink-0 rounded-md p-2 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
        >
          <Check aria-hidden="true" className="size-4" />
        </button>
      )}
    </li>
  );
}
