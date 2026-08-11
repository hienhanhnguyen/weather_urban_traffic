import type { WeatherUnits } from "@/features/weather/api";
import type { FiredRule, RiskBand } from "./api";

const HOUR_MS = 3_600_000;

export const MAX_HORIZON_HOURS = 48;

const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalInput(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function fromLocalInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return toLocalInput(date) === value ? date : null;
}

export function nextHour(now: Date): Date {
  const date = new Date(now);
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
}

export type DepartureProblem = "required" | "past" | "tooFar";

export function checkDeparture(
  value: string,
  now: Date,
): DepartureProblem | null {
  const at = fromLocalInput(value);
  if (!at) return "required";

  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);

  if (at.getTime() < currentHour.getTime()) return "past";
  if (at.getTime() > now.getTime() + MAX_HORIZON_HOURS * HOUR_MS) {
    return "tooFar";
  }

  return null;
}

const UNIT_FOR_METRIC = (units: WeatherUnits) =>
  ({
    temp: units.temp,
    wind: units.wind,
    precip: units.precip,
    precipProb: "%",
    weatherCode: "",
  }) as const;

export function ruleReading(
  rule: FiredRule,
  units: WeatherUnits,
): string | null {
  if (rule.metric === "weatherCode" || rule.value === null) return null;
  return `${rule.value}${UNIT_FOR_METRIC(units)[rule.metric]}`;
}

export function ruleThreshold(
  rule: FiredRule,
  units: WeatherUnits,
): string | null {
  if (rule.metric === "weatherCode" || rule.threshold === null) return null;
  return `${rule.threshold}${UNIT_FOR_METRIC(units)[rule.metric]}`;
}

export const BAND_CLASSES: Record<RiskBand, string> = {
  low: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  moderate: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  high: "border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300",
  severe: "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
};

export const BAND_BAR_CLASSES: Record<RiskBand, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-orange-500",
  severe: "bg-red-500",
};

export const barHeight = (score: number) => `${Math.max(6, Math.min(score, 100))}%`;
