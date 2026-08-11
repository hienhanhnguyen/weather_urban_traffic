"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Thermometer,
  Umbrella,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { WeatherUnits } from "@/features/weather/api";
import type { ReportKpis } from "./api";
import { kpiItems, type KpiKey } from "./format";

const ICONS: Record<KpiKey, LucideIcon> = {
  avgTemp: Thermometer,
  totalPrecip: CloudRain,
  maxPrecipProb: Umbrella,
  avgHumidity: Droplets,
  avgWind: Wind,
  disruptiveHours: AlertTriangle,
};

export function KpiCards({
  kpis,
  units,
}: {
  kpis: ReportKpis;
  units: WeatherUnits;
}) {
  const t = useTranslations("businessReports.kpi");

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {kpiItems(kpis, units).map((item) => {
        const Icon = ICONS[item.key];

        return (
          <li
            key={item.key}
            className="rounded-lg border border-border p-4"
          >
            <p className="flex items-center gap-2 text-sm opacity-70">
              <Icon aria-hidden="true" className="size-4" />
              {t(item.key)}
            </p>

            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {item.value}
            </p>

            {item.detail && (
              <p className="mt-1 text-xs opacity-60">
                {t(`detail.${item.detail.key}`, { value: item.detail.value })}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
