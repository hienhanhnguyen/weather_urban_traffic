"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { HourlySlot } from "./api";
import { WeatherIcon } from "./WeatherIcon";

const HOURS = 24;

export function HourlyStrip({
  hourly,
  timezone,
  tempUnit,
}: {
  hourly: HourlySlot[];
  timezone: string;
  tempUnit: string;
}) {
  const t = useTranslations("weather");
  const format = useFormatter();

  const slots = hourly.slice(0, HOURS).filter((slot) => slot.time !== null);

  if (slots.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{t("hourlyTitle")}</h2>

      <ul className="flex gap-2 overflow-x-auto rounded-lg border border-border p-3">
        {slots.map((slot) => {
          const time = new Date(slot.time as string);

          return (
            <li
              key={slot.time}
              className="flex w-16 shrink-0 flex-col items-center gap-1 text-center"
            >
              <span className="text-xs opacity-60">
                {format.dateTime(time, {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: timezone,
                })}
              </span>

              <WeatherIcon
                code={slot.weatherCode}
                className="size-5 opacity-80"
              />

              <span className="text-sm font-medium">
                {slot.temp === null
                  ? "—"
                  : `${Math.round(slot.temp)}${tempUnit}`}
              </span>

              <span className="text-xs opacity-60">
                {slot.precipProb === null
                  ? ""
                  : `${Math.round(slot.precipProb)}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
