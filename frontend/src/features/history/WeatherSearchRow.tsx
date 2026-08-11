"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { CloudSun } from "lucide-react";
import { WeatherIcon } from "@/features/weather/WeatherIcon";
import { weatherHrefFor } from "@/features/weather/link";
import { codeFromTag, conditionFor } from "@/features/weather/wmo";
import type { WeatherSearchEntry } from "./api";

export function WeatherSearchRow({ search }: { search: WeatherSearchEntry }) {
  const t = useTranslations("history.weather");
  const tConditions = useTranslations("weather.conditions");
  const format = useFormatter();

  const searchedAt = new Date(search.searchedAt);
  const code = codeFromTag(search.condition);
  const condition = conditionFor(code);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      {code === null ? (
        <CloudSun aria-hidden="true" className="mt-0.5 size-5 opacity-40" />
      ) : (
        <WeatherIcon code={code} isDay className="mt-0.5 size-5 opacity-80" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{search.label}</p>

        <p className="flex flex-wrap gap-x-3 text-xs opacity-70">
          {search.temperatureC !== null && (
            <span className="tabular-nums">
              {format.number(search.temperatureC, {
                maximumFractionDigits: 1,
              })}
              °C
            </span>
          )}
          <span>{tConditions(condition.key)}</span>
        </p>

        <p className="text-xs opacity-50">
          <time dateTime={search.searchedAt}>
            {format.dateTime(searchedAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          {" · "}
          {format.relativeTime(searchedAt)}
        </p>
      </div>

      <Link
        href={weatherHrefFor(search)}
        aria-label={t("reopen", { label: search.label })}
        className="shrink-0 rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <CloudSun aria-hidden="true" className="size-4" />
      </Link>
    </li>
  );
}
