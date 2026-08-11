"use client";

import { useFormatter, useTranslations } from "next-intl";

export interface DistanceParts {
  value: number;
  unit: "m" | "km";
  fractionDigits: number;
}

export function distanceParts(meters: number): DistanceParts {
  return meters < 1000
    ? { value: Math.round(meters), unit: "m", fractionDigits: 0 }
    : { value: meters / 1000, unit: "km", fractionDigits: 1 };
}

export interface DurationParts {
  hours: number;
  minutes: number;
}

export function durationParts(seconds: number): DurationParts {
  const total = Math.round(seconds / 60);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

const MISSING = "—";

export function useRouteFormat() {
  const t = useTranslations("map.route");
  const format = useFormatter();

  return {
    distance(meters: number | null | undefined) {
      if (meters === null || meters === undefined) return MISSING;

      const { value, unit, fractionDigits } = distanceParts(meters);
      return `${format.number(value, { maximumFractionDigits: fractionDigits })} ${unit}`;
    },

    duration(seconds: number | null | undefined) {
      if (seconds === null || seconds === undefined) return MISSING;

      const { hours, minutes } = durationParts(seconds);
      return hours === 0
        ? t("minutes", { count: minutes })
        : t("hoursMinutes", { hours, minutes });
    },
  };
}
