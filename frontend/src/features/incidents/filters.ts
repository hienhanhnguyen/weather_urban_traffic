import type { AlertSeverity } from "@/features/notifications/api";
import type { IncidentQuery, IncidentStatus } from "./api";

export type Timeframe = "24h" | "7d" | "30d" | "all";
export type SeverityFilter = "all" | AlertSeverity;
export type StatusFilter = "all" | IncidentStatus;

export interface IncidentFilters {
  timeframe: Timeframe;
  areaId: number | null;
  severity: SeverityFilter;
  status: StatusFilter;
}

export const TIMEFRAMES: readonly Timeframe[] = ["24h", "7d", "30d", "all"];

export const SEVERITY_FILTERS: readonly SeverityFilter[] = [
  "all",
  "info",
  "warning",
  "critical",
];

export const STATUS_FILTERS: readonly StatusFilter[] = [
  "all",
  "pending",
  "acknowledged",
  "resolved",
];

export const STATUSES: readonly IncidentStatus[] = [
  "pending",
  "acknowledged",
  "resolved",
];

export const DEFAULT_FILTERS: IncidentFilters = {
  timeframe: "7d",
  areaId: null,
  severity: "all",
  status: "all",
};

export const ALL_AREAS = "all";

export function parseAreaId(value: string): number | null {
  if (value === ALL_AREAS) return null;

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export const areaSelectValue = (areaId: number | null) =>
  areaId === null ? ALL_AREAS : String(areaId);

export const isFiltered = (filters: IncidentFilters) =>
  filters.timeframe !== DEFAULT_FILTERS.timeframe ||
  filters.areaId !== null ||
  filters.severity !== "all" ||
  filters.status !== "all";

export function toSummaryQuery(filters: IncidentFilters): IncidentQuery {
  return {
    ...(filters.timeframe !== "all" && { timeframe: filters.timeframe }),
    ...(filters.areaId !== null && { area_id: filters.areaId }),
    ...(filters.severity !== "all" && { severity: filters.severity }),
    ...(filters.status !== "all" && { status: filters.status }),
  };
}

export const toIncidentQuery = (
  filters: IncidentFilters,
  page: number,
): IncidentQuery => ({ ...toSummaryQuery(filters), page });

export function nextStatuses(status: IncidentStatus): IncidentStatus[] {
  if (status === "pending") return ["acknowledged", "resolved"];
  if (status === "acknowledged") return ["resolved", "pending"];

  return ["pending"];
}

export const pendingShare = (total: number, pending: number) =>
  total === 0 ? 0 : Math.round((pending / total) * 100);
