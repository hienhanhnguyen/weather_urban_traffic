import { apiRequest } from "@/lib/api/client";
import type { AlertSeverity } from "@/features/notifications/api";
import type { AreaMetric } from "./alerts-api";
import type { ManagedArea } from "./api";

export type AreaRisk =
  | "none"
  | "unknown"
  | "clear"
  | "info"
  | "warning"
  | "critical";

export interface AreaReading {
  observedAt: string | null;
  isDay: boolean;
  weatherCode: number | null;
  temp: number | null;
  feelsLike: number | null;
  humidity: number | null;
  precip: number | null;
  precipProb: number | null;
  windSpeed: number | null;
}

export interface AreaMetricStatus {
  metric: AreaMetric;
  unit: string;
  threshold: number;
  severity: AlertSeverity;
  isEnabled: boolean;
  value: number | null;
  exceeded: boolean;
}

export interface HeatmapArea extends ManagedArea {
  risk: AreaRisk;
  reading: AreaReading | null;
  metrics: AreaMetricStatus[];
}

export const HEATMAP_QUERY_KEY = ["gov", "areas", "heatmap"] as const;

export const HEATMAP_REFRESH_MS = 10 * 60 * 1000;

export const getHeatmap = () =>
  apiRequest<{ areas: HeatmapArea[] }>("/gov/areas/heatmap").then(
    (response) => response.areas,
  );
