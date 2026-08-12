import { boundsOf, type Position } from "@/features/map/geometry";
import type { AreaTally } from "@/features/incidents/api";
import type { AreaRisk, HeatmapArea } from "./heatmap-api";
import { ringOf } from "./geometry";

export const RISKS: readonly AreaRisk[] = [
  "critical",
  "warning",
  "info",
  "clear",
  "unknown",
  "none",
];

export const RISK_COLOR: Record<AreaRisk, string> = {
  critical: "#dc2626",
  warning: "#f59e0b",
  info: "#0ea5e9",
  clear: "#10b981",
  unknown: "#94a3b8",
  none: "#cbd5e1",
};

export const RISK_FILL_OPACITY: Record<AreaRisk, number> = {
  critical: 0.4,
  warning: 0.36,
  info: 0.3,
  clear: 0.24,
  unknown: 0.2,
  none: 0.1,
};

const RISK_RANK: Record<AreaRisk, number> = {
  none: 0,
  clear: 1,
  unknown: 2,
  info: 3,
  warning: 4,
  critical: 5,
};

export const riskRank = (risk: AreaRisk) => RISK_RANK[risk];

export const AT_RISK: readonly AreaRisk[] = ["info", "warning", "critical"];

export const isAtRisk = (risk: AreaRisk) => AT_RISK.includes(risk);

export const sortByRisk = (areas: HeatmapArea[]): HeatmapArea[] =>
  [...areas].sort(
    (a, b) =>
      riskRank(b.risk) - riskRank(a.risk) || a.name.localeCompare(b.name),
  );

export const exceededMetrics = (area: HeatmapArea) =>
  area.metrics.filter((metric) => metric.isEnabled && metric.exceeded);

export interface HeatmapDigest {
  total: number;
  atRisk: number;
  unwatched: number;
  worst: AreaRisk;
  counts: Record<AreaRisk, number>;
  avgPrecip: number | null;
  maxWind: number | null;
  windiest: string | null;
}

const emptyCounts = (): Record<AreaRisk, number> => ({
  none: 0,
  unknown: 0,
  clear: 0,
  info: 0,
  warning: 0,
  critical: 0,
});

export function digest(areas: HeatmapArea[]): HeatmapDigest {
  const counts = emptyCounts();

  let worst: AreaRisk = "none";
  let precipTotal = 0;
  let precipCount = 0;
  let maxWind: number | null = null;
  let windiest: string | null = null;

  for (const area of areas) {
    counts[area.risk] += 1;
    if (riskRank(area.risk) > riskRank(worst)) worst = area.risk;

    const precip = area.reading?.precip;
    if (typeof precip === "number") {
      precipTotal += precip;
      precipCount += 1;
    }

    const wind = area.reading?.windSpeed;
    if (typeof wind === "number" && (maxWind === null || wind > maxWind)) {
      maxWind = wind;
      windiest = area.name;
    }
  }

  return {
    total: areas.length,
    atRisk: AT_RISK.reduce((sum, risk) => sum + counts[risk], 0),
    unwatched: counts.none,
    worst,
    counts,
    avgPrecip: precipCount === 0 ? null : precipTotal / precipCount,
    maxWind,
    windiest,
  };
}

export interface AreaFeatureProperties {
  id: number;
  name: string;
  risk: AreaRisk;
  color: string;
  opacity: number;
  selected: boolean;
}

export function heatmapCollection(
  areas: HeatmapArea[],
  selectedId: number | null,
) {
  return {
    type: "FeatureCollection" as const,
    features: areas.map((area) => ({
      type: "Feature" as const,
      id: area.id,
      geometry: area.boundary,
      properties: {
        id: area.id,
        name: area.name,
        risk: area.risk,
        color: RISK_COLOR[area.risk],
        opacity: RISK_FILL_OPACITY[area.risk],
        selected: area.id === selectedId,
      } satisfies AreaFeatureProperties,
    })),
  };
}

export const boundsOfAreas = (areas: HeatmapArea[]) =>
  boundsOf(areas.flatMap((area) => ringOf(area.boundary) as Position[]));

export interface IncidentPin {
  areaId: number;
  name: string;
  center: { latitude: number; longitude: number };
  total: number;
  pending: number;
  worstSeverity: AreaTally["worstSeverity"];
}

export function incidentPins(
  areas: HeatmapArea[],
  tallies: AreaTally[],
): IncidentPin[] {
  const byId = new Map(areas.map((area) => [area.id, area]));

  return tallies
    .filter((tally) => tally.total > 0 && byId.has(tally.areaId))
    .map((tally) => ({
      areaId: tally.areaId,
      name: tally.name,
      center: byId.get(tally.areaId)!.center,
      total: tally.total,
      pending: tally.pending,
      worstSeverity: tally.worstSeverity,
    }));
}
