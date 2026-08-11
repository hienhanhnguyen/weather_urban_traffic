"use client";

import { useTranslations } from "next-intl";
import { WeatherIcon } from "@/features/weather/WeatherIcon";
import { conditionFor, type Severity } from "@/features/weather/wmo";
import type { GeoRoute } from "./api";
import { useRouteFormat } from "./format";
import type { RouteConditions } from "./routeWeather";

const BARS: Record<Severity, string> = {
  clear: "bg-emerald-500",
  caution: "bg-amber-500",
  severe: "bg-red-600",
};

const TONES: Record<Severity, string> = {
  clear: "border-emerald-500/40 bg-emerald-500/10",
  caution: "border-amber-500/40 bg-amber-500/10",
  severe: "border-red-600/40 bg-red-600/10",
};

export function RouteSummary({
  route,
  conditions,
  showConditions,
}: {
  route: GeoRoute;
  conditions: RouteConditions;
  showConditions: boolean;
}) {
  const t = useTranslations("map.route");
  const tConditions = useTranslations("weather.conditions");
  const routeFormat = useRouteFormat();

  const distance = routeFormat.distance(route.distanceMeters);
  const duration = routeFormat.duration(route.durationSeconds);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex gap-6">
        <div>
          <span className="block text-xs uppercase tracking-wide opacity-60">
            {t("distance")}
          </span>
          <span className="block text-xl font-semibold tabular-nums">
            {distance}
          </span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide opacity-60">
            {t("duration")}
          </span>
          <span className="block text-xl font-semibold tabular-nums">
            {duration}
          </span>
        </div>
      </div>

      {showConditions && (
        <>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
              {t("conditionsTitle")}
            </h3>

            <ul className="flex gap-1">
              {conditions.segments.map(({ weather, severity }, index) => {
                const condition = conditionFor(weather?.weatherCode ?? null);

                return (
                  <li key={index} className="min-w-0 flex-1 text-center">
                    <span
                      aria-hidden="true"
                      className={`block h-1.5 rounded-full ${
                        weather === null ? "bg-slate-400/50" : BARS[severity]
                      }`}
                    />

                    {weather ? (
                      <span className="mt-1.5 flex flex-col items-center gap-0.5">
                        <WeatherIcon
                          code={weather.weatherCode}
                          isDay={weather.isDay}
                          className="size-4 opacity-80"
                        />
                        <span className="truncate text-[11px] opacity-70">
                          {t(`severity.${severity}`)}
                        </span>
                        {weather.temp !== null && (
                          <span className="text-[11px] tabular-nums opacity-60">
                            {Math.round(weather.temp)}
                            {weather.units.temp}
                          </span>
                        )}
                        <span className="sr-only">
                          {tConditions(condition.key)}
                        </span>
                      </span>
                    ) : (
                      <span className="mt-1.5 block text-[11px] opacity-50">
                        {conditions.isError ? "—" : "…"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {!conditions.isPending && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${TONES[conditions.overall]}`}
            >
              <p>
                {t(`advisory.${conditions.overall}`, {
                  count: conditions.affected,
                  total: conditions.total,
                })}
              </p>
              <p className="mt-1 text-xs opacity-60">{t("advisory.basis")}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
