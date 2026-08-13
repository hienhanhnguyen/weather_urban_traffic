"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Droplets, Gauge, Umbrella, Wind } from "lucide-react";
import type { CurrentWeather } from "./api";
import { WeatherIcon } from "./WeatherIcon";
import { compassFor, conditionFor } from "./wmo";

const round = (value: number | null) =>
  value === null ? null : Math.round(value);

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon aria-hidden="true" className="size-4 shrink-0 opacity-60" />
      <span className="min-w-0">
        <span className="block text-xs opacity-60">{label}</span>
        <span className="block text-sm font-medium">{value}</span>
      </span>
    </div>
  );
}

export function CurrentWeatherCard({
  current,
  address,
}: {
  current: CurrentWeather;
  address: string;
}) {
  const t = useTranslations("weather");
  const format = useFormatter();

  const condition = conditionFor(current.weatherCode);
  const compass = compassFor(current.windDirection);
  const { temp, wind, precip } = current.units;

  const dash = "—";
  const show = (value: number | null, unit: string) =>
    value === null ? dash : `${value}${unit}`;

  return (
    <section className="rounded-lg border border-border p-5">
      <div className="flex items-center gap-4">
        <WeatherIcon
          code={current.weatherCode}
          isDay={current.isDay}
          className="size-14 shrink-0 opacity-80"
        />

        <div className="min-w-0">
          <p className="text-4xl font-semibold tracking-tight">
            {show(round(current.temp), temp)}
          </p>
          <p className="text-sm">{t(`conditions.${condition.key}`)}</p>
          <p className="text-xs opacity-60">
            {t("feelsLike", {
              value: show(round(current.feelsLike), temp),
            })}
          </p>
        </div>

        {current.observedAt && (
          <p className="ml-auto max-w-56 self-start text-right text-xs opacity-60">
            {t("observedAt", {
              time: format.dateTime(new Date(current.observedAt), {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: current.timezone,
              }),
            })}
            <span className="block">{address}</span>
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          icon={Droplets}
          label={t("humidity")}
          value={show(round(current.humidity), "%")}
        />
        <Stat
          icon={Umbrella}
          label={t("rainChance")}
          value={show(round(current.precipProb), "%")}
        />
        <Stat
          icon={Wind}
          label={t("wind")}
          value={
            current.windSpeed === null
              ? dash
              : `${round(current.windSpeed)} ${wind}${
                  compass ? ` ${t(`compass.${compass}`)}` : ""
                }`
          }
        />
        <Stat
          icon={Gauge}
          label={t("pressure")}
          value={show(round(current.pressure), " hPa")}
        />
      </div>

      <p className="mt-3 text-xs opacity-60">
        {t("precipitation", { value: show(current.precip, ` ${precip}`) })}
      </p>
    </section>
  );
}
