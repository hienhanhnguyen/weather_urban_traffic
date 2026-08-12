import { AREA_METRICS } from "@/features/areas/alerts";
import type { AreaMetric } from "@/features/areas/alerts-api";
import type { Timeframe } from "@/features/incidents/filters";
import type {
  DailyRow,
  GovReportQuery,
  GovReportRange,
  GovReportSchedule,
  ReportTopic,
  SaveGovScheduleInput,
  ScheduleFrequency,
} from "./api";

export const REPORT_TOPICS: readonly ReportTopic[] = [
  "areas",
  "incidents",
  "scenarios",
];

export const SCHEDULE_RANGES: readonly GovReportRange[] = ["24h", "7d", "30d"];

export const REPORT_TIMEFRAMES: readonly Timeframe[] = [
  "24h",
  "7d",
  "30d",
  "all",
];

// A report with no sections is a title and a footer, so the last topic cannot
// be turned off — the same rule the API enforces.
export function toggleTopic(
  topics: ReportTopic[],
  topic: ReportTopic,
): ReportTopic[] {
  if (!topics.includes(topic)) {
    return REPORT_TOPICS.filter(
      (entry) => entry === topic || topics.includes(entry),
    );
  }

  const kept = topics.filter((entry) => entry !== topic);

  return kept.length === 0 ? topics : kept;
}

export interface ReportFilters {
  timeframe: Timeframe;
  areaId: number | null;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  timeframe: "7d",
  areaId: null,
};

export const toReportQuery = (filters: ReportFilters): GovReportQuery => ({
  timeframe: filters.timeframe,
  ...(filters.areaId !== null && { area_id: filters.areaId }),
});

export type Duration =
  | { kind: "none" }
  | { kind: "minutes"; minutes: number }
  | { kind: "hours"; hours: number; minutes: number };

const MINUTES_PER_HOUR = 60;

export function duration(total: number | null): Duration {
  if (total === null) return { kind: "none" };
  if (total < MINUTES_PER_HOUR) return { kind: "minutes", minutes: total };

  return {
    kind: "hours",
    hours: Math.floor(total / MINUTES_PER_HOUR),
    minutes: total % MINUTES_PER_HOUR,
  };
}

// Noon keeps the label on the intended day whatever the viewer's offset is.
export const dayDate = (day: string) => new Date(`${day}T12:00:00`);

export const SEVERITY_COLORS = {
  info: "#0ea5e9",
  warning: "#f59e0b",
  critical: "#ef4444",
} as const;

export const busiestDay = (daily: DailyRow[]): DailyRow | null =>
  daily.reduce<DailyRow | null>(
    (busiest, row) =>
      busiest === null || row.total > busiest.total ? row : busiest,
    null,
  );

export const isAreaMetric = (metric: string): metric is AreaMetric =>
  (AREA_METRICS as readonly string[]).includes(metric);

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const weekdayDate = (weekday: number) => new Date(2024, 0, 7 + weekday);

export const MAX_DAY_OF_MONTH = 28;

export const DAYS_OF_MONTH = Array.from(
  { length: MAX_DAY_OF_MONTH },
  (_, index) => index + 1,
);

export const HOURS = Array.from({ length: 24 }, (_, index) => index);

export const DEFAULT_HOUR = 7;

export interface ScheduleFormState {
  range: GovReportRange;
  topics: ReportTopic[];
  frequency: ScheduleFrequency;
  weekday: string;
  dayOfMonth: string;
  hour: string;
}

export const emptyScheduleForm: ScheduleFormState = {
  range: "7d",
  topics: [...REPORT_TOPICS],
  frequency: "weekly",
  weekday: "1",
  dayOfMonth: "1",
  hour: String(DEFAULT_HOUR),
};

export function scheduleForm(
  schedule: GovReportSchedule | null,
): ScheduleFormState {
  if (!schedule) return emptyScheduleForm;

  return {
    range: schedule.range,
    topics: schedule.topics,
    frequency: schedule.frequency,
    weekday: String(schedule.weekday ?? emptyScheduleForm.weekday),
    dayOfMonth: String(schedule.dayOfMonth ?? emptyScheduleForm.dayOfMonth),
    hour: String(schedule.hour),
  };
}

export type ScheduleProblem = "topicsRequired";

export const checkSchedule = (
  form: ScheduleFormState,
): ScheduleProblem | null => (form.topics.length === 0 ? "topicsRequired" : null);

export function schedulePayload(
  form: ScheduleFormState,
): SaveGovScheduleInput | null {
  if (checkSchedule(form)) return null;

  const common = {
    range: form.range,
    topics: form.topics,
    frequency: form.frequency,
    hour: Number(form.hour),
  };

  return form.frequency === "weekly"
    ? { ...common, weekday: Number(form.weekday) }
    : { ...common, day_of_month: Number(form.dayOfMonth) };
}
