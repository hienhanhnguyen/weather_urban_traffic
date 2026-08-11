import { apiRequest } from "@/lib/api/client";
import type { SavedRoute } from "@/features/routes/api";
import type { WeatherUnits } from "@/features/weather/api";

export type ReportRange = "24h" | "7d";

export type ScheduleFrequency = "weekly" | "monthly";

export type ConditionGroup =
  | "clear"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

export interface ReportKpis {
  hours: number;
  avgTemp: number | null;
  minTemp: number | null;
  maxTemp: number | null;
  totalPrecip: number | null;
  maxPrecipProb: number | null;
  avgHumidity: number | null;
  avgWind: number | null;
  maxWind: number | null;
  wetHours: number;
  disruptiveHours: number;
}

export interface ReportPoint {
  role: "start" | "end";
  latitude: number;
  longitude: number;
  address: string | null;
}

export interface SeriesRow {
  at: string;
  temp: number | null;
  tempMin: number | null;
  tempMax: number | null;
  precip: number | null;
  precipProb: number | null;
  humidity: number | null;
  wind: number | null;
}

export interface ConditionCount {
  group: ConditionGroup;
  hours: number;
}

export interface BusinessReport {
  route: SavedRoute;
  range: ReportRange;
  generatedAt: string;
  timezone: string;
  units: WeatherUnits;
  points: ReportPoint[];
  kpis: ReportKpis;
  series: SeriesRow[];
  frequency: ConditionCount[];
}

export interface ReportSchedule {
  id: number;
  routeId: number;
  range: ReportRange;
  frequency: ScheduleFrequency;
  weekday: number | null;
  dayOfMonth: number | null;
  hour: number;
  nextRunAt: string | null;
  lastSentAt: string | null;
}

export interface SaveScheduleInput {
  route_id: number;
  range: ReportRange;
  frequency: ScheduleFrequency;
  weekday?: number;
  day_of_month?: number;
  hour: number;
}

export const REPORT_QUERY_KEY = ["business", "report"] as const;

export const SCHEDULE_QUERY_KEY = ["business", "report-schedule"] as const;

export const reportQueryKey = (routeId: number, range: ReportRange) =>
  [...REPORT_QUERY_KEY, routeId, range] as const;

export const getReport = (routeId: number, range: ReportRange) =>
  apiRequest<BusinessReport>("/business/report", {
    query: { route_id: routeId, range },
  });

export const emailReport = (routeId: number, range: ReportRange) =>
  apiRequest<{ sentTo: string; generatedAt: string }>(
    "/business/report/email",
    { method: "POST", body: { route_id: routeId, range } },
  );

export const getSchedule = () =>
  apiRequest<{ schedule: ReportSchedule | null }>(
    "/business/report-schedule",
  ).then((response) => response.schedule);

export const saveSchedule = (body: SaveScheduleInput) =>
  apiRequest<{ schedule: ReportSchedule }>("/business/report-schedule", {
    method: "PUT",
    body,
  }).then((response) => response.schedule);

export const deleteSchedule = () =>
  apiRequest<void>("/business/report-schedule", { method: "DELETE" });
