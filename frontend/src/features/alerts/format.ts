import type {
  AlertMetric,
  AlertOperator,
  AlertScope,
  AlertSeverity,
} from "./api";

export const METRICS: readonly AlertMetric[] = [
  "temp",
  "feelslike",
  "precip",
  "precipprob",
];

export const OPERATORS: readonly AlertOperator[] = [">", ">=", "<", "<="];

export const SCOPES: readonly AlertScope[] = ["current", "forecast_24h"];

export const SEVERITIES: readonly AlertSeverity[] = [
  "info",
  "warning",
  "critical",
];

export const DEFAULT_UNIT: Record<AlertMetric, string> = {
  temp: "C",
  feelslike: "C",
  precip: "mm",
  precipprob: "%",
};

const UNIT_LABELS: Record<string, string> = { C: "°C", F: "°F" };

export const unitLabel = (unit: string | null | undefined) =>
  unit ? (UNIT_LABELS[unit] ?? unit) : "";

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

export const isMuted = (
  severity: AlertSeverity,
  minSeverity: AlertSeverity | undefined,
) =>
  minSeverity !== undefined &&
  SEVERITY_RANK[severity] < SEVERITY_RANK[minSeverity];
