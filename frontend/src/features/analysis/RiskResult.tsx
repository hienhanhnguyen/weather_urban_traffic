"use client";

import { useFormatter, useTranslations } from "next-intl";
import { CalendarClock, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WeatherIcon } from "@/features/weather/WeatherIcon";
import type { RiskAssessment, RiskPoint } from "./api";
import {
  BAND_CLASSES,
  ruleReading,
  ruleThreshold,
} from "./format";
import { RiskOutlook } from "./RiskOutlook";

function BandChip({
  band,
  label,
}: {
  band: RiskAssessment["band"];
  label: string;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-sm font-semibold ${BAND_CLASSES[band]}`}
    >
      {label}
    </span>
  );
}

function PointCard({
  point,
  worst,
  units,
}: {
  point: RiskPoint;
  worst: boolean;
  units: RiskAssessment["units"];
}) {
  const t = useTranslations("risk.result");
  const tRoles = useTranslations("risk.roles");
  const tBands = useTranslations("risk.bands");

  const { conditions } = point;
  const reading = (value: number | null, unit: string) =>
    value === null ? "—" : `${value}${unit}`;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{tRoles(point.role)}</span>
        <BandChip band={point.band} label={tBands(point.band)} />
      </div>

      <div className="flex items-center gap-2">
        <WeatherIcon code={conditions.weatherCode} className="size-5 opacity-80" />
        <span className="text-sm tabular-nums">
          {reading(conditions.temp, units.temp)}
        </span>
        <span className="text-sm opacity-70 tabular-nums">
          {reading(conditions.precip, units.precip)}
        </span>
        <span className="text-sm opacity-70 tabular-nums">
          {reading(conditions.wind, units.wind)}
        </span>
      </div>

      <p className="text-sm opacity-70">
        {t("pointScore", { score: point.score })}
        {worst ? ` · ${t("drivesTheScore")}` : ""}
      </p>
    </li>
  );
}

export function RiskResult({
  result,
  onUseSuggestion,
}: {
  result: RiskAssessment;
  onUseSuggestion: (at: string) => void;
}) {
  const t = useTranslations("risk.result");
  const tBands = useTranslations("risk.bands");
  const tRules = useTranslations("risk.rules");
  const tAdvice = useTranslations("risk.advice");
  const tRoles = useTranslations("risk.roles");
  const tSuggestion = useTranslations("risk.suggestion");
  const format = useFormatter();

  const { suggestion } = result;

  const when = (at: string) =>
    format.dateTime(new Date(at), {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: result.timezone,
    });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <BandChip band={result.band} label={tBands(result.band)} />

          <span className="text-2xl font-semibold tabular-nums">
            {result.score}
            <span className="text-base font-normal opacity-60">
              {t("outOf")}
            </span>
          </span>

          <span className="text-sm opacity-70">
            {t("assessedFor", {
              time: when(result.assessedAt),
              timezone: result.timezone,
            })}
          </span>
        </div>

        <p className="flex items-start gap-2 text-sm opacity-70">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("ruleBasedNote")}
        </p>
      </section>

      {suggestion && (
        <section
          className={`flex flex-wrap items-center gap-3 rounded-lg border p-4 ${BAND_CLASSES[suggestion.band]}`}
        >
          <CalendarClock aria-hidden="true" className="size-5 shrink-0" />

          <p className="text-sm">
            {tSuggestion("body", {
              time: when(suggestion.at),
              band: tBands(suggestion.band),
            })}
          </p>

          <Button
            type="button"
            variant="secondary"
            className="ml-auto"
            onClick={() => onUseSuggestion(suggestion.at)}
          >
            {tSuggestion("use")}
          </Button>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold">{t("adviceTitle")}</h3>

        <ul className="mt-2 flex flex-col gap-1.5">
          {result.advice.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 opacity-60" />
              {tAdvice(key)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold">{t("whyTitle")}</h3>

        {result.rules.length === 0 ? (
          <p className="mt-2 text-sm opacity-70">{t("nothingFired")}</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-100 text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 font-medium">
                    {t("ruleColumn")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("readingColumn")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("thresholdColumn")}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    {t("pointsColumn")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {result.rules.map((rule) => (
                  <tr key={rule.key} className="border-b border-border/60">
                    <td className="py-2">{tRules(rule.key)}</td>
                    <td className="py-2 tabular-nums">
                      {ruleReading(rule, result.units) ?? "—"}
                    </td>
                    <td className="py-2 tabular-nums opacity-70">
                      {ruleThreshold(rule, result.units) ?? "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      +{rule.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {result.points.length > 1 && (
        <section>
          <h3 className="text-sm font-semibold">
            {t("pointsTitle", { role: tRoles(result.worstPoint) })}
          </h3>

          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {result.points.map((point) => (
              <PointCard
                key={point.role}
                point={point}
                worst={point.role === result.worstPoint}
                units={result.units}
              />
            ))}
          </ul>
        </section>
      )}

      <RiskOutlook outlook={result.outlook} timezone={result.timezone} />
    </div>
  );
}
