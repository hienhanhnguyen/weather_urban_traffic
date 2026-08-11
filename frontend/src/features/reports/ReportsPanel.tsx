"use client";

import { useState } from "react";
import Link from "next/link";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Select";
import { isApiError } from "@/lib/api/errors";
import { listRoutes, routesQueryKey } from "@/features/routes/api";
import {
  REPORT_QUERY_KEY,
  emailReport,
  getReport,
  reportQueryKey,
  type ReportRange,
} from "./api";
import { CHART_METRICS, RANGES, type ChartMetric } from "./format";
import { ConditionChart } from "./ConditionChart";
import { KpiCards } from "./KpiCards";
import { ScheduleEditor } from "./ScheduleEditor";
import { TrendChart } from "./TrendChart";

const STALE_TIME = 5 * 60 * 1000;

export function ReportsPanel() {
  const t = useTranslations("businessReports");
  const tRange = useTranslations("businessReports.ranges");
  const tMetrics = useTranslations("businessReports.metrics");
  const tChart = useTranslations("businessReports.chart");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const format = useFormatter();

  const [chosenRoute, setChosenRoute] = useState<number | null>(null);
  const [range, setRange] = useState<ReportRange>("24h");
  const [metric, setMetric] = useState<ChartMetric>("temp");

  const routes = useQuery({
    queryKey: routesQueryKey(1),
    queryFn: () => listRoutes(1),
  });

  const saved = routes.data?.routes ?? [];

  const routeId = chosenRoute ?? saved[0]?.id ?? null;

  const report = useQuery({
    queryKey: routeId ? reportQueryKey(routeId, range) : REPORT_QUERY_KEY,
    queryFn: routeId ? () => getReport(routeId, range) : skipToken,
    staleTime: STALE_TIME,
  });

  const mail = useMutation({
    mutationFn: (id: number) => emailReport(id, range),
  });

  const data = report.data;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
      </header>

      {routes.isError && <Callout tone="error">{t("routesFailed")}</Callout>}

      {routes.isSuccess && saved.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6">
          <p className="text-sm font-medium">{t("noRoutes")}</p>
          <p className="mt-1 text-sm opacity-70">{t("noRoutesHint")}</p>
          <Link
            href="/map"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            {t("planRoute")}
          </Link>
        </div>
      )}

      {saved.length > 0 && (
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label={t("controls.route")}
            value={routeId === null ? "" : String(routeId)}
            onChange={(event) => {
              mail.reset();
              setChosenRoute(Number(event.target.value));
            }}
            options={saved.map((route) => ({
              value: String(route.id),
              label: route.name,
            }))}
          />

          <Select
            label={t("controls.range")}
            value={range}
            onChange={(event) => {
              mail.reset();
              setRange(event.target.value as ReportRange);
            }}
            options={RANGES.map((option) => ({
              value: option,
              label: tRange(option),
            }))}
          />

          <Button
            type="button"
            variant="secondary"
            loading={mail.isPending}
            disabled={!data || routeId === null}
            onClick={() => routeId !== null && mail.mutate(routeId)}
          >
            <Mail aria-hidden="true" className="size-4" />
            {t("controls.email")}
          </Button>
        </div>
      )}

      {mail.isSuccess && (
        <Callout tone="success">
          {t("emailed", { address: mail.data.sentTo })}
        </Callout>
      )}

      {mail.isError && (
        <Callout tone="error">
          {isApiError(mail.error) ? mail.error.message : tErrors("generic")}
        </Callout>
      )}

      {report.isPending && routeId !== null && (
        <p className="text-sm opacity-70">{tCommon("loading")}</p>
      )}

      {report.isError && (
        <Callout tone="error">
          {t("reportFailed")}{" "}
          <button
            type="button"
            onClick={() => void report.refetch()}
            className="underline underline-offset-4"
          >
            {tCommon("tryAgain")}
          </button>
        </Callout>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm opacity-70">
              {t("generatedAt", {
                at: format.dateTime(new Date(data.generatedAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
            <p className="text-sm opacity-70">
              {data.points
                .map((point) => point.address ?? t(`points.${point.role}`))
                .join(" → ")}
            </p>
          </div>

          <KpiCards kpis={data.kpis} units={data.units} />

          <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{tChart("trend")}</h2>
                <p className="mt-1 text-sm opacity-70">
                  {tChart(range === "24h" ? "trendHourly" : "trendDaily")}
                </p>
              </div>

              <div
                role="group"
                aria-label={tChart("metric")}
                className="flex flex-wrap gap-1 rounded-md border border-border p-1"
              >
                {CHART_METRICS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={option === metric}
                    onClick={() => setMetric(option)}
                    className={
                      "rounded px-3 py-1.5 text-sm " +
                      (option === metric
                        ? "bg-sky-600 text-white"
                        : "hover:bg-black/5 dark:hover:bg-white/10")
                    }
                  >
                    {tMetrics(option)}
                  </button>
                ))}
              </div>
            </div>

            <TrendChart
              series={data.series}
              range={data.range}
              metric={metric}
              units={data.units}
              timezone={data.timezone}
            />
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div>
              <h2 className="text-base font-semibold">
                {tChart("distribution")}
              </h2>
              <p className="mt-1 text-sm opacity-70">
                {tChart("distributionHint")}
              </p>
            </div>

            <ConditionChart frequency={data.frequency} />
          </section>
        </div>
      )}

      {saved.length > 0 && <ScheduleEditor routes={saved} routeId={routeId} />}
    </div>
  );
}
