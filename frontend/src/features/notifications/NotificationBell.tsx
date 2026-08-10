"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
  ALERT_EVENTS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
  countUnread,
  eventsPageQueryKey,
  listEvents,
  markAllEventsRead,
  markEventRead,
  type AlertEvent,
} from "./api";
import { useNotifications } from "./NotificationProvider";
import { SeverityDot } from "./SeverityDot";

const BADGE_CAP = 99;

export function NotificationBell() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const { status } = useNotifications();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const unread = useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: countUnread,
  });

  const events = useQuery({
    queryKey: eventsPageQueryKey(1),
    queryFn: () => listEvents(1),
    enabled: open,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ALERT_EVENTS_QUERY_KEY });

  const markOne = useMutation({
    mutationFn: markEventRead,
    onSuccess: refresh,
  });
  const markAll = useMutation({
    mutationFn: markAllEventsRead,
    onSuccess: refresh,
  });

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const count = unread.data ?? 0;
  const rows: AlertEvent[] = events.data?.events ?? [];

  const openEvent = (event: AlertEvent) => {
    if (!event.isRead) markOne.mutate(event.id);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("unreadCount", { count })}
        className="relative rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <Bell aria-hidden="true" className="size-5" />

        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-red-600 px-1 text-[10px] leading-4 font-semibold text-white"
          >
            {count > BADGE_CAP ? `${BADGE_CAP}+` : count}
          </span>
        )}

        {status !== "open" && (
          <span
            title={t("reconnecting")}
            className="absolute -bottom-0.5 -left-0.5 size-2 rounded-full bg-amber-500"
          >
            <span className="sr-only">{t("reconnecting")}</span>
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-background shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold">{t("title")}</h2>

            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={count === 0 || markAll.isPending}
              className="ml-auto text-xs underline-offset-4 hover:underline disabled:no-underline disabled:opacity-50"
            >
              {t("markAllRead")}
            </button>
          </div>

          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {events.isPending && (
              <li className="px-3 py-6 text-center text-sm opacity-70">
                {tCommon("loading")}
              </li>
            )}

            {events.isError && (
              <li
                role="alert"
                className="px-3 py-6 text-center text-sm text-red-700 dark:text-red-400"
              >
                {t("loadFailed")}
              </li>
            )}

            {events.isSuccess && rows.length === 0 && (
              <li className="px-3 py-6 text-center text-sm opacity-70">
                {t("empty")}
              </li>
            )}

            {rows.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => openEvent(event)}
                  className={
                    "flex w-full gap-2 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 " +
                    (event.isRead ? "opacity-60" : "")
                  }
                >
                  <SeverityDot severity={event.severity} className="mt-1.5" />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {event.title}
                    </span>
                    <span className="block text-xs opacity-70">
                      {event.body}
                    </span>
                    <span className="block text-xs opacity-50">
                      {format.relativeTime(new Date(event.createdAt))}
                    </span>
                  </span>

                  {!event.isRead && (
                    <span className="sr-only">{t("unreadItem")}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-border px-3 py-2 text-center">
            <Link
              href="/history"
              onClick={() => setOpen(false)}
              className="text-xs underline-offset-4 hover:underline"
            >
              {tCommon("viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
