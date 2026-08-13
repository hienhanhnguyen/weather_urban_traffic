"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { useRelativeTime } from "@/i18n/relative-time";
import type { PushDevice } from "./api";

export function PushDeviceRow({
  device,
  isThisDevice,
  onRemove,
  removing,
}: {
  device: PushDevice;
  isThisDevice: boolean;
  onRemove: () => void;
  removing: boolean;
}) {
  const t = useTranslations("account.push");
  const format = useFormatter();
  const relativeTime = useRelativeTime();

  const lastUsedAt = device.lastUsedAt ? new Date(device.lastUsedAt) : null;
  const createdAt = new Date(device.createdAt);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {device.userAgent ?? t("unknownDevice")}
          {isThisDevice && (
            <span className="ml-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs font-normal">
              {t("thisDevice")}
            </span>
          )}
        </p>

        <p className="text-xs opacity-50">
          {lastUsedAt ? (
            <>
              {t("lastUsed")}{" "}
              <time dateTime={device.lastUsedAt ?? undefined}>
                {relativeTime(lastUsedAt)}
              </time>
            </>
          ) : (
            <>
              {t("addedOn")}{" "}
              <time dateTime={device.createdAt}>
                {format.dateTime(createdAt, { dateStyle: "medium" })}
              </time>
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label={t("removeDevice", {
          device: device.userAgent ?? t("unknownDevice"),
        })}
        className="shrink-0 rounded-md p-2 hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}
