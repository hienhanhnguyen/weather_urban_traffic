"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeatherUnits } from "@/features/weather/api";
import type { ReportRange, SeriesRow } from "./api";
import {
  METRIC_COLORS,
  dayLabelDate,
  metricKind,
  metricUnit,
  metricValue,
  type ChartMetric,
} from "./format";

const AXIS = { fill: "currentColor", fontSize: 12 };

export function TrendChart({
  series,
  range,
  metric,
  units,
  timezone,
}: {
  series: SeriesRow[];
  range: ReportRange;
  metric: ChartMetric;
  units: WeatherUnits;
  timezone: string;
}) {
  const t = useTranslations("businessReports.chart");
  const tMetrics = useTranslations("businessReports.metrics");
  const format = useFormatter();

  const unit = metricUnit(metric, units);
  const daily = range === "7d";

  const label = (at: string) =>
    daily
      ? format.dateTime(dayLabelDate(at), { weekday: "short", day: "numeric" })
      : format.dateTime(new Date(at), {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: timezone,
        });

  const data = series.map((row) => ({
    label: label(row.at),
    value: metricValue(row, metric),
    min: row.tempMin,
    max: row.tempMax,
  }));

  const spread = daily && metric === "temp";

  return (
    <div className="opacity-80">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid
              stroke="currentColor"
              opacity={0.15}
              vertical={false}
            />
            <XAxis dataKey="label" tick={AXIS} stroke="currentColor" />
            <YAxis tick={AXIS} stroke="currentColor" unit={unit} width={56} />

            <Tooltip
              cursor={{ fill: "currentColor", opacity: 0.08 }}
              formatter={(value) => `${value}${unit}`}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                color: "var(--foreground)",
                fontSize: "0.8125rem",
              }}
            />

            {metricKind(metric) === "bar" ? (
              <Bar
                dataKey="value"
                name={tMetrics(metric)}
                fill={METRIC_COLORS[metric]}
                radius={[3, 3, 0, 0]}
              />
            ) : (
              <Line
                dataKey="value"
                name={tMetrics(metric)}
                stroke={METRIC_COLORS[metric]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}

            {spread && (
              <Line
                dataKey="max"
                name={t("tempMax")}
                stroke={METRIC_COLORS.temp}
                strokeWidth={1}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
              />
            )}

            {spread && (
              <Line
                dataKey="min"
                name={t("tempMin")}
                stroke={METRIC_COLORS.temp}
                strokeWidth={1}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
