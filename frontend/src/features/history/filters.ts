import type { AlertSeverity, EventQuery } from "@/features/notifications/api";
import type { SearchQuery } from "./api";

export type ReadFilter = "all" | "unread" | "read";
export type SeverityFilter = "all" | AlertSeverity;

export interface DateRange {
  from: string;
  to: string;
}

export interface HistoryFilters extends DateRange {
  read: ReadFilter;
  severity: SeverityFilter;
}

export const EMPTY_RANGE: DateRange = { from: "", to: "" };

export const EMPTY_FILTERS: HistoryFilters = {
  read: "all",
  severity: "all",
  from: "",
  to: "",
};

export const READ_FILTERS: readonly ReadFilter[] = ["all", "unread", "read"];

export const SEVERITY_FILTERS: readonly SeverityFilter[] = [
  "all",
  "info",
  "warning",
  "critical",
];

const dayBoundary = (day: string, endOfDay: boolean) => {
  const [year, month, date] = day.split("-").map(Number);

  if (!year || !month || !date) return undefined;

  const instant = endOfDay
    ? new Date(year, month - 1, date, 23, 59, 59, 999)
    : new Date(year, month - 1, date);

  return Number.isNaN(instant.getTime()) ? undefined : instant.toISOString();
};

export const startOfDay = (day: string) => dayBoundary(day, false);
export const endOfDay = (day: string) => dayBoundary(day, true);

export const isRangeBackwards = (range: DateRange) =>
  range.from !== "" && range.to !== "" && range.from > range.to;

export const isRangeSet = (range: DateRange) =>
  range.from !== "" || range.to !== "";

export const toSearchQuery = (range: DateRange, page: number): SearchQuery => ({
  page,
  ...(range.from !== "" && { from: startOfDay(range.from) }),
  ...(range.to !== "" && { to: endOfDay(range.to) }),
});

export const isFiltered = (filters: HistoryFilters) =>
  filters.read !== "all" ||
  filters.severity !== "all" ||
  filters.from !== "" ||
  filters.to !== "";

export const toEventQuery = (
  filters: HistoryFilters,
  page: number,
): EventQuery => ({
  page,
  ...(filters.read !== "all" && { isRead: filters.read === "read" }),
  ...(filters.severity !== "all" && { severity: filters.severity }),
  ...(filters.from !== "" && { from: startOfDay(filters.from) }),
  ...(filters.to !== "" && { to: endOfDay(filters.to) }),
});
