"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ScenarioStatusBadge } from "@/features/scenarios/ScenarioBadges";
import type { GovReport } from "./api";
import { isAreaMetric } from "./report";

const CELL = "px-4 py-2";

export function MeasurementTable({ report }: { report: GovReport }) {
  const t = useTranslations("govReports.measurements");
  const tMetrics = useTranslations("areaAlerts.metrics");
  const format = useFormatter();

  const total = report.summary.total;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-sm opacity-70">{t("subtitle")}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[24rem] text-sm">
          <thead className="border-b border-border text-left">
            <tr>
              <th scope="col" className={`${CELL} font-medium`}>
                {t("metric")}
              </th>
              <th scope="col" className={`${CELL} text-right font-medium`}>
                {t("count")}
              </th>
              <th scope="col" className={`${CELL} text-right font-medium`}>
                {t("share")}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {report.metrics.map((row) => (
              <tr key={row.metric}>
                <th scope="row" className={`${CELL} text-left font-medium`}>
                  {isAreaMetric(row.metric)
                    ? tMetrics(row.metric)
                    : t("otherMetric")}
                </th>

                <td className={`${CELL} text-right tabular-nums`}>
                  {format.number(row.count)}
                </td>

                <td className={`${CELL} text-right tabular-nums opacity-70`}>
                  {total === 0
                    ? "—"
                    : format.number(row.count / total, {
                        style: "percent",
                        maximumFractionDigits: 0,
                      })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PlanUsageTable({ report }: { report: GovReport }) {
  const t = useTranslations("govReports.plans");
  const format = useFormatter();

  const used = report.scenarios.rows.filter((row) => row.activations > 0);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-sm opacity-70">
          {t("subtitle", {
            activated: report.scenarios.activated,
            uncovered: report.scenarios.uncovered,
          })}
        </p>
      </div>

      {used.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm opacity-70">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[24rem] text-sm">
            <thead className="border-b border-border text-left">
              <tr>
                <th scope="col" className={`${CELL} font-medium`}>
                  {t("plan")}
                </th>
                <th scope="col" className={`${CELL} font-medium`}>
                  {t("status")}
                </th>
                <th scope="col" className={`${CELL} text-right font-medium`}>
                  {t("activations")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {used.map((row) => (
                <tr key={row.scenarioId}>
                  <th scope="row" className={`${CELL} text-left font-medium`}>
                    {row.name}
                  </th>

                  <td className={CELL}>
                    <ScenarioStatusBadge status={row.status} />
                  </td>

                  <td className={`${CELL} text-right tabular-nums`}>
                    {format.number(row.activations)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
