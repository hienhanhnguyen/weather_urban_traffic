"use client";

import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, Droplets, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HeatmapDigest } from "./heatmap";

interface Card {
  key: "atRisk" | "rainfall" | "wind";
  icon: LucideIcon;
  tone: string;
  value: string;
  note?: string;
}
export function ConditionCards({ digest }: { digest: HeatmapDigest }) {
  const t = useTranslations("govHeatmap.conditions");
  const format = useFormatter();

  const measure = (value: number | null, unit: string) =>
    value === null
      ? t("noData")
      : `${format.number(value, { maximumFractionDigits: 1 })} ${unit}`;

  const cards: Card[] = [
    {
      key: "atRisk",
      icon: AlertTriangle,
      tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      value: t("atRiskValue", { count: digest.atRisk, total: digest.total }),
    },
    {
      key: "rainfall",
      icon: Droplets,
      tone: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
      value: measure(digest.avgPrecip, "mm"),
    },
    {
      key: "wind",
      icon: Wind,
      tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      value: measure(digest.maxWind, "km/h"),
      note: digest.windiest
        ? t("windiest", { name: digest.windiest })
        : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.key} className="rounded-lg border border-border p-4">
          <div
            className={
              "inline-flex items-center gap-2 rounded-full px-2.5 py-1 " +
              `text-xs font-medium ${card.tone}`
            }
          >
            <card.icon aria-hidden="true" className="size-3.5" />
            {t(card.key)}
          </div>

          <p className="mt-3 text-2xl font-semibold tabular-nums">
            {card.value}
          </p>

          {card.note && <p className="mt-1 text-xs opacity-60">{card.note}</p>}
        </div>
      ))}
    </div>
  );
}
