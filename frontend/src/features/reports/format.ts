import type { WeatherUnits } from "@/features/weather/api";
import type {
  ConditionCount,
  ConditionGroup,
  ReportKpis,
  ReportRange,
  ReportSchedule,
  SaveScheduleInput,
  ScheduleFrequency,
  SeriesRow,
} from "./api";

const NO_VALUE = "—";

const show = (value: number | null, unit: string) =>
  value === null ? NO_VALUE : `${value}${unit}`;

export const RANGES: readonly ReportRange[] = ["24h", "7d"];

export type ChartMetric = "temp" | "precip" | "wind" | "humidity";

export const CHART_METRICS: readonly ChartMetric[] = [
  "temp",
  "precip",
  "wind",
  "humidity",
];

export const metricKind = (metric: ChartMetric): "bar" | "line" =>
  metric === "precip" ? "bar" : "line";

export function metricUnit(metric: ChartMetric, units: WeatherUnits): string {
  if (metric === "temp") return units.temp;
  if (metric === "precip") return units.precip;
  if (metric === "wind") return units.wind;
  return "%";
}

export const metricValue = (row: SeriesRow, metric: ChartMetric) => row[metric];

export const dayLabelDate = (at: string) => new Date(`${at}T12:00:00`);

export type KpiKey =
  | "avgTemp"
  | "totalPrecip"
  | "maxPrecipProb"
  | "avgHumidity"
  | "avgWind"
  | "disruptiveHours";

export type KpiDetailKey = "range" | "wetHours" | "peakWind";

export interface KpiItem {
  key: KpiKey;
  value: string;
  detail: { key: KpiDetailKey; value: string } | null;
}

export function kpiItems(kpis: ReportKpis, units: WeatherUnits): KpiItem[] {
  const span =
    kpis.minTemp === null || kpis.maxTemp === null
      ? null
      : `${kpis.minTemp}${units.temp} – ${kpis.maxTemp}${units.temp}`;

  return [
    {
      key: "avgTemp",
      value: show(kpis.avgTemp, units.temp),
      detail: span === null ? null : { key: "range", value: span },
    },
    {
      key: "totalPrecip",
      value: show(kpis.totalPrecip, units.precip),
      detail: { key: "wetHours", value: `${kpis.wetHours}/${kpis.hours}` },
    },
    {
      key: "maxPrecipProb",
      value: show(kpis.maxPrecipProb, "%"),
      detail: null,
    },
    {
      key: "avgHumidity",
      value: show(kpis.avgHumidity, "%"),
      detail: null,
    },
    {
      key: "avgWind",
      value: show(kpis.avgWind, units.wind),
      detail:
        kpis.maxWind === null
          ? null
          : { key: "peakWind", value: `${kpis.maxWind}${units.wind}` },
    },
    {
      key: "disruptiveHours",
      value: `${kpis.disruptiveHours}/${kpis.hours}`,
      detail: null,
    },
  ];
}

export interface ConditionRow {
  group: ConditionGroup;
  hours: number;
  share: number;
}

export function conditionRows(frequency: ConditionCount[]): ConditionRow[] {
  const total = frequency.reduce((sum, entry) => sum + entry.hours, 0);
  if (total === 0) return [];

  return frequency
    .filter((entry) => entry.hours > 0)
    .map((entry) => ({ ...entry, share: entry.hours / total }))
    .sort((a, b) => b.hours - a.hours);
}

export const CONDITION_COLORS: Record<ConditionGroup, string> = {
  clear: "#f59e0b",
  cloudy: "#94a3b8",
  fog: "#64748b",
  drizzle: "#38bdf8",
  rain: "#0ea5e9",
  snow: "#c4b5fd",
  thunder: "#a855f7",
};

export const METRIC_COLORS: Record<ChartMetric, string> = {
  temp: "#f97316",
  precip: "#0ea5e9",
  wind: "#14b8a6",
  humidity: "#8b5cf6",
};

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export function weekdayDate(weekday: number): Date {
  return new Date(2024, 0, 7 + weekday);
}

export const MAX_DAY_OF_MONTH = 28;

export const DAYS_OF_MONTH = Array.from(
  { length: MAX_DAY_OF_MONTH },
  (_, index) => index + 1,
);

export const HOURS = Array.from({ length: 24 }, (_, index) => index);

export const DEFAULT_HOUR = 7;

export interface ScheduleFormState {
  routeId: string;
  range: ReportRange;
  frequency: ScheduleFrequency;
  weekday: string;
  dayOfMonth: string;
  hour: string;
}

export const emptyScheduleForm: ScheduleFormState = {
  routeId: "",
  range: "24h",
  frequency: "weekly",
  weekday: "1",
  dayOfMonth: "1",
  hour: String(DEFAULT_HOUR),
};

export function scheduleForm(
  schedule: ReportSchedule | null,
  fallbackRouteId?: number,
): ScheduleFormState {
  if (!schedule) {
    return {
      ...emptyScheduleForm,
      routeId: fallbackRouteId === undefined ? "" : String(fallbackRouteId),
    };
  }

  return {
    routeId: String(schedule.routeId),
    range: schedule.range,
    frequency: schedule.frequency,
    weekday: String(schedule.weekday ?? emptyScheduleForm.weekday),
    dayOfMonth: String(schedule.dayOfMonth ?? emptyScheduleForm.dayOfMonth),
    hour: String(schedule.hour),
  };
}

export type ScheduleProblem = "routeRequired";

export function checkSchedule(form: ScheduleFormState): ScheduleProblem | null {
  return Number.isInteger(Number(form.routeId)) && Number(form.routeId) > 0
    ? null
    : "routeRequired";
}

export function schedulePayload(
  form: ScheduleFormState,
): SaveScheduleInput | null {
  if (checkSchedule(form)) return null;

  const common = {
    route_id: Number(form.routeId),
    range: form.range,
    frequency: form.frequency,
    hour: Number(form.hour),
  };

  return form.frequency === "weekly"
    ? { ...common, weekday: Number(form.weekday) }
    : { ...common, day_of_month: Number(form.dayOfMonth) };
}
