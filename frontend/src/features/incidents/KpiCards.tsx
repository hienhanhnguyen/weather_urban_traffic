"use client";

import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, MapPin, ShieldAlert, Siren } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { IncidentSummary } from "./api";

interface Card {
  key: "total" | "pending" | "critical" | "areas";
  icon: LucideIcon;
  tone: string;
  value: string;
}

export function KpiCards({ summary }: { summary: IncidentSummary }) {
  const t = useTranslations("govDashboard.kpi");
  const format = useFormatter();

  const number = (value: number) => format.number(value);

  const cards: Card[] = [
    {
      key: "total",
      icon: AlertTriangle,
      tone: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
      value: number(summary.total),
    },
    {
      key: "pending",
      icon: Siren,
      tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      value: number(summary.byStatus.pending),
    },
    {
      key: "critical",
      icon: ShieldAlert,
      tone: "bg-red-500/15 text-red-700 dark:text-red-400",
      value: number(summary.bySeverity.critical),
    },
    {
      key: "areas",
      icon: MapPin,
      tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      value: t("areasValue", {
        affected: summary.areasAffected,
        total: summary.areas.length,
      }),
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      ))}
    </section>
  );
}
