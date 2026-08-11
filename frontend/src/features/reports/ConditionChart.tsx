"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ConditionCount } from "./api";
import { CONDITION_COLORS, conditionRows } from "./format";

const AXIS = { fill: "currentColor", fontSize: 12 };

export function ConditionChart({
  frequency,
}: {
  frequency: ConditionCount[];
}) {
  const t = useTranslations("businessReports.chart");
  const tGroups = useTranslations("businessReports.conditions");

  const rows = conditionRows(frequency).map((row) => ({
    ...row,
    label: tGroups(row.group),
  }));

  if (rows.length === 0) {
    return <p className="text-sm opacity-70">{t("noData")}</p>;
  }

  return (
    <div className="h-64 w-full opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer
          layout="vertical"
          data={rows}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="currentColor" opacity={0.15} horizontal={false} />
          <XAxis type="number" tick={AXIS} stroke="currentColor" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={AXIS}
            stroke="currentColor"
            width={88}
          />

          <Tooltip
            cursor={{ fill: "currentColor", opacity: 0.08 }}
            formatter={(value) => `${value} ${t("hours")}`}
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              color: "var(--foreground)",
              fontSize: "0.8125rem",
            }}
          />

          <Bar dataKey="hours" name={t("hours")} radius={[0, 3, 3, 0]}>
            {rows.map((row) => (
              <Cell key={row.group} fill={CONDITION_COLORS[row.group]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
