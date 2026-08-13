"use client";

import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, Droplets, Thermometer, Umbrella, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRelativeTime } from "@/i18n/relative-time";
import { WeatherIcon } from "@/features/weather/WeatherIcon";
import { conditionFor } from "@/features/weather/wmo";
import { SeverityBadge } from "@/features/incidents/StatusBadge";
import type { AreaTally } from "@/features/incidents/api";
import { METRIC_UNIT } from "./alerts";
import type { HeatmapArea } from "./heatmap-api";
import { RiskBadge } from "./RiskBadge";

interface Fact {
  key: "temp" | "precip" | "precipprob" | "wind";
  icon: LucideIcon;
  value: string;
}

export function AreaRiskDetail({
  area,
  tally,
}: {
  area: HeatmapArea;
  tally: AreaTally | null;
}) {
  const t = useTranslations("govHeatmap.detail");
  const tTypes = useTranslations("govAreas.types");
  const tMetrics = useTranslations("areaAlerts.metrics");
  const tWeather = useTranslations("weather.conditions");
  const format = useFormatter();
  const relativeTime = useRelativeTime();

  const reading = area.reading;
  const dash = "—";

  const number = (value: number | null, unit: string) =>
    value === null ? dash : `${format.number(value)} ${unit}`;

  const facts: Fact[] = [
    {
      key: "temp",
      icon: Thermometer,
      value: number(reading?.temp ?? null, "°C"),
    },
    {
      key: "precip",
      icon: Droplets,
      value: number(reading?.precip ?? null, "mm"),
    },
    {
      key: "precipprob",
      icon: Umbrella,
      value: number(reading?.precipProb ?? null, "%"),
    },
    {
      key: "wind",
      icon: Wind,
      value: number(reading?.windSpeed ?? null, "km/h"),
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge risk={area.risk} />
          {tally?.worstSeverity && (
            <SeverityBadge severity={tally.worstSeverity} />
          )}
        </div>

        <h2 className="text-base font-semibold">{area.name}</h2>

        <p className="text-sm opacity-70">
          {tTypes(area.areaType)}
          {area.address ? ` · ${area.address}` : ""}
        </p>
      </div>

      {reading ? (
        <>
          <div className="flex items-center gap-3">
            <WeatherIcon
              code={reading.weatherCode}
              isDay={reading.isDay}
              className="size-8"
            />

            <div>
              <p className="text-sm font-medium">
                {tWeather(conditionFor(reading.weatherCode).key)}
              </p>

              {reading.observedAt && (
                <p className="text-xs opacity-60">
                  {t("observed", {
                    time: relativeTime(new Date(reading.observedAt)),
                  })}
                </p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            {facts.map((fact) => (
              <div key={fact.key}>
                <dt className="flex items-center gap-1.5 opacity-60">
                  <fact.icon aria-hidden="true" className="size-3.5" />
                  {t(`facts.${fact.key}`)}
                </dt>
                <dd className="font-medium tabular-nums">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-sm opacity-70">{t("noReading")}</p>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t("rules")}</h3>

        {area.metrics.length === 0 ? (
          <p className="text-sm opacity-70">{t("noRules")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {area.metrics.map((metric) => (
              <li
                key={metric.metric}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="opacity-70">{tMetrics(metric.metric)}</span>

                <span className="tabular-nums">
                  {t(metric.exceeded ? "over" : "under", {
                    value:
                      metric.value === null
                        ? dash
                        : format.number(metric.value),
                    threshold: format.number(metric.threshold),
                    unit: METRIC_UNIT[metric.metric],
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/gov/areas"
          className="inline-flex items-center gap-1 self-start text-sm underline underline-offset-4"
        >
          {t("editRules")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>

      <section className="flex flex-col gap-2 border-t border-border pt-3">
        <h3 className="text-sm font-medium">{t("incidents")}</h3>

        <p className="text-sm opacity-70">
          {tally
            ? t("incidentCounts", { total: tally.total, pending: tally.pending })
            : t("noIncidents")}
        </p>

        <Link
          href="/gov/incidents"
          className="inline-flex items-center gap-1 self-start text-sm underline underline-offset-4"
        >
          {t("openIncidents")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </div>
  );
}
