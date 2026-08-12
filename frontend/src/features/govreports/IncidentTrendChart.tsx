"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AlertSeverity } from "@/features/notifications/api";
import type { DailyRow } from "./api";
import { SEVERITY_COLORS, dayDate } from "./report";

const AXIS = { fill: "currentColor", fontSize: 12 };

const STACK: readonly AlertSeverity[] = ["info", "warning", "critical"];

export function IncidentTrendChart({ daily }: { daily: DailyRow[] }) {
  const t = useTranslations("govReports.chart");
  const tSeverity = useTranslations("notifications.severities");
  const format = useFormatter();

  const data = daily.map((row) => ({
    label: format.dateTime(dayDate(row.day), {
      day: "2-digit",
      month: "2-digit",
    }),
    info: row.info,
    warning: row.warning,
    critical: row.critical,
  }));

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div>
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
      </div>

      <div className="h-64 w-full opacity-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
          >
            <CartesianGrid
              stroke="currentColor"
              opacity={0.15}
              vertical={false}
            />
            <XAxis dataKey="label" tick={AXIS} stroke="currentColor" />
            <YAxis tick={AXIS} stroke="currentColor" allowDecimals={false} />

            <Tooltip
              cursor={{ fill: "currentColor", opacity: 0.08 }}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                color: "var(--foreground)",
                fontSize: "0.8125rem",
              }}
            />

            <Legend wrapperStyle={{ fontSize: "0.8125rem" }} />

            {STACK.map((severity) => (
              <Bar
                key={severity}
                dataKey={severity}
                stackId="severity"
                name={tSeverity(severity)}
                fill={SEVERITY_COLORS[severity]}
                radius={severity === "critical" ? [3, 3, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
