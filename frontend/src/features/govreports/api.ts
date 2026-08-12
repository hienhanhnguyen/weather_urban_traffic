import { apiRequest } from "@/lib/api/client";
import type { AlertSeverity } from "@/features/notifications/api";
import type {
  AreaTally,
  Incident,
  IncidentStatus,
} from "@/features/incidents/api";
import type { ScenarioStatus } from "@/features/scenarios/api";

export type GovReportRange = "24h" | "7d" | "30d";

export type ReportTopic = "areas" | "incidents" | "scenarios";

export type ScheduleFrequency = "weekly" | "monthly";

export interface ReportWindow {
  timeframe: string | null;
  from: string | null;
  to: string | null;
  areaId: number | null;
}

export interface DailyRow {
  day: string;
  total: number;
  info: number;
  warning: number;
  critical: number;
}

export interface MetricRow {
  metric: string;
  count: number;
}

export interface ResponseStats {
  handled: number;
  pending: number;
  handledShare: number;
  averageMinutes: number | null;
  slowestMinutes: number | null;
}

export interface ScenarioRow {
  scenarioId: number;
  name: string;
  status: ScenarioStatus;
  activations: number;
}

export interface ScenarioUsage {
  rows: ScenarioRow[];
  activated: number;
  uncovered: number;
}

export interface GovReportSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<IncidentStatus, number>;
  areasAffected: number;
  areasManaged: number;
}

export interface GovReport {
  range: ReportWindow;
  generatedAt: string;
  timezone: string;
  truncated: boolean;
  summary: GovReportSummary;
  areas: AreaTally[];
  daily: DailyRow[];
  metrics: MetricRow[];
  response: ResponseStats;
  scenarios: ScenarioUsage;
  recent: Incident[];
}

export interface GovReportSchedule {
  id: number;
  range: GovReportRange;
  topics: ReportTopic[];
  frequency: ScheduleFrequency;
  weekday: number | null;
  dayOfMonth: number | null;
  hour: number;
  nextRunAt: string | null;
  lastSentAt: string | null;
}

export type GovReportQuery = {
  timeframe?: string;
  area_id?: number;
};

export interface EmailReportInput extends GovReportQuery {
  topics: ReportTopic[];
}

export interface SaveGovScheduleInput {
  range: GovReportRange;
  topics: ReportTopic[];
  frequency: ScheduleFrequency;
  weekday?: number;
  day_of_month?: number;
  hour: number;
}

export const GOV_REPORT_QUERY_KEY = ["gov", "report"] as const;

export const GOV_SCHEDULE_QUERY_KEY = ["gov", "report-schedule"] as const;

export const govReportQueryKey = (query: GovReportQuery) =>
  [...GOV_REPORT_QUERY_KEY, query] as const;

export const getGovReport = (query: GovReportQuery = {}) =>
  apiRequest<GovReport>("/gov/reports", { query });

export const emailGovReport = (body: EmailReportInput) =>
  apiRequest<{ sentTo: string; generatedAt: string }>("/gov/reports/email", {
    method: "POST",
    body,
  });

export const getGovSchedule = () =>
  apiRequest<{ schedule: GovReportSchedule | null }>(
    "/gov/reports/schedule",
  ).then((response) => response.schedule);

export const saveGovSchedule = (body: SaveGovScheduleInput) =>
  apiRequest<{ schedule: GovReportSchedule }>("/gov/reports/schedule", {
    method: "PUT",
    body,
  }).then((response) => response.schedule);

export const deleteGovSchedule = () =>
  apiRequest<void>("/gov/reports/schedule", { method: "DELETE" });
