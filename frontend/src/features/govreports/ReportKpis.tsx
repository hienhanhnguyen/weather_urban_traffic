"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ClipboardList,
  MapPin,
  ShieldAlert,
  Siren,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { GovReport } from "./api";
import { duration } from "./report";

type CardKey =
  | "total"
  | "pending"
  | "critical"
  | "response"
  | "areas"
  | "plans";

const ICONS: Record<CardKey, LucideIcon> = {
  total: AlertTriangle,
  pending: Siren,
  critical: ShieldAlert,
  response: Timer,
  areas: MapPin,
  plans: ClipboardList,
};

const TONES: Record<CardKey, string> = {
  total: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  response: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  areas: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  plans: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

export function useDurationLabel() {
  const t = useTranslations("govReports.duration");

  return (minutes: number | null) => {
    const span = duration(minutes);

    if (span.kind === "none") return t("none");
    if (span.kind === "minutes") return t("minutes", { minutes: span.minutes });

    return t("hours", { hours: span.hours, minutes: span.minutes });
  };
}

export function ReportKpis({ report }: { report: GovReport }) {
  const t = useTranslations("govReports.kpi");
  const format = useFormatter();
  const label = useDurationLabel();

  const { summary, response, scenarios } = report;

  const cards: { key: CardKey; value: string; detail: string }[] = [
    {
      key: "total",
      value: format.number(summary.total),
      detail: t("totalDetail", { areas: summary.areasAffected }),
    },
    {
      key: "pending",
      value: format.number(response.pending),
      detail: t("pendingDetail", {
        share: format.number(response.handledShare, {
          style: "percent",
          maximumFractionDigits: 0,
        }),
      }),
    },
    {
      key: "critical",
      value: format.number(summary.bySeverity.critical),
      detail: t("criticalDetail", { count: summary.bySeverity.warning }),
    },
    {
      key: "response",
      value: label(response.averageMinutes),
      detail: t("responseDetail", { slowest: label(response.slowestMinutes) }),
    },
    {
      key: "areas",
      value: `${format.number(summary.areasAffected)} / ${format.number(summary.areasManaged)}`,
      detail: t("areasDetail"),
    },
    {
      key: "plans",
      value: format.number(scenarios.activated),
      detail: t("plansDetail", { count: scenarios.uncovered }),
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = ICONS[card.key];

        return (
          <div key={card.key} className="rounded-lg border border-border p-4">
            <div
              className={
                "inline-flex items-center gap-2 rounded-full px-2.5 py-1 " +
                `text-xs font-medium ${TONES[card.key]}`
              }
            >
              <Icon aria-hidden="true" className="size-3.5" />
              {t(card.key)}
            </div>

            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {card.value}
            </p>

            <p className="mt-1 text-xs opacity-60">{card.detail}</p>
          </div>
        );
      })}
    </section>
  );
}
