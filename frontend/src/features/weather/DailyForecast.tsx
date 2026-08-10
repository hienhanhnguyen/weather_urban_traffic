"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Sunrise, Sunset, Umbrella } from "lucide-react";
import type { DailySlot } from "./api";
import { WeatherIcon } from "./WeatherIcon";
import { conditionFor } from "./wmo";

export function DailyForecast({
  daily,
  timezone,
  tempUnit,
}: {
  daily: DailySlot[];
  timezone: string;
  tempUnit: string;
}) {
  const t = useTranslations("weather");
  const format = useFormatter();

  const days = daily.filter((day) => day.date !== null);
  if (days.length === 0) return null;

  const temp = (value: number | null) =>
    value === null ? "—" : `${Math.round(value)}${tempUnit}`;

  const time = (iso: string | null) =>
    iso === null
      ? "—"
      : format.dateTime(new Date(iso), {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: timezone,
        });

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{t("dailyTitle")}</h2>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {days.map((day) => {
          const condition = conditionFor(day.weatherCode);

          const date = new Date(`${day.date}T00:00:00Z`);

          return (
            <li
              key={day.date}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
            >
              <span className="w-12 text-sm font-medium">
                {format.dateTime(date, { weekday: "short", timeZone: "UTC" })}
              </span>

              <WeatherIcon
                code={day.weatherCode}
                className="size-5 shrink-0 opacity-80"
              />

              <span className="min-w-0 flex-1 truncate text-sm opacity-70">
                {t(`conditions.${condition.key}`)}
              </span>

              {day.precipProbMax !== null && (
                <span className="flex items-center gap-1 text-xs opacity-70">
                  <Umbrella aria-hidden="true" className="size-3.5" />
                  {Math.round(day.precipProbMax)}%
                </span>
              )}

              <span className="hidden items-center gap-3 text-xs opacity-60 sm:flex">
                <span className="flex items-center gap-1">
                  <Sunrise aria-hidden="true" className="size-3.5" />
                  {time(day.sunrise)}
                </span>
                <span className="flex items-center gap-1">
                  <Sunset aria-hidden="true" className="size-3.5" />
                  {time(day.sunset)}
                </span>
              </span>

              <span className="text-sm tabular-nums">
                <span className="opacity-60">{temp(day.tempMin)}</span>
                <span className="mx-1 opacity-30">/</span>
                <span className="font-medium">{temp(day.tempMax)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
