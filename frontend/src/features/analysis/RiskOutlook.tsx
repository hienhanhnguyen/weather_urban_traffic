"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { OutlookHour } from "./api";
import { BAND_BAR_CLASSES, barHeight } from "./format";

export function RiskOutlook({
  outlook,
  timezone,
}: {
  outlook: OutlookHour[];
  timezone: string;
}) {
  const t = useTranslations("risk.outlook");
  const tBands = useTranslations("risk.bands");
  const format = useFormatter();

  if (outlook.length === 0) return null;

  const hour = (at: string) =>
    format.dateTime(new Date(at), {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });

  return (
    <section>
      <h3 className="text-sm font-semibold">{t("title")}</h3>
      <p className="mt-1 text-sm opacity-70">{t("description")}</p>

      <ul className="mt-3 flex items-end gap-2 overflow-x-auto rounded-lg border border-border p-3">
        {outlook.map((entry) => (
          <li
            key={entry.at}
            className="flex w-14 shrink-0 flex-col items-center gap-1"
          >
            <span className="text-xs tabular-nums opacity-60">
              {entry.score}
            </span>

            <span
              aria-hidden="true"
              className="flex h-20 w-full items-end rounded bg-black/5 dark:bg-white/10"
            >
              <span
                style={{ height: barHeight(entry.score) }}
                className={`w-full rounded ${BAND_BAR_CLASSES[entry.band]}`}
              />
            </span>

            <span className="text-xs opacity-60">{hour(entry.at)}</span>

            <span className="sr-only">
              {t("reading", {
                hour: hour(entry.at),
                band: tBands(entry.band),
                score: entry.score,
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
