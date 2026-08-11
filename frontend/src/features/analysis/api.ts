import { apiRequest } from "@/lib/api/client";
import type { WeatherUnits } from "@/features/weather/api";

export type RiskBand = "low" | "moderate" | "high" | "severe";

export type RuleKey =
  | "rain"
  | "rainChance"
  | "wind"
  | "heat"
  | "cold"
  | "thunderstorm"
  | "snow"
  | "freezing"
  | "fog";

export type RuleMetric =
  | "precip"
  | "precipProb"
  | "wind"
  | "temp"
  | "weatherCode";

export type AdviceKey =
  | "postpone"
  | "allowExtraTime"
  | "goAsPlanned"
  | "slipperyRoad"
  | "carryRainGear"
  | "highSidedVehicles"
  | "heatStress"
  | "coldStress"
  | "shelterFromLightning"
  | "icyRoad"
  | "reducedVisibility";

export type PointRole = "start" | "end";

export interface FiredRule {
  key: RuleKey;
  metric: RuleMetric;
  value: number | null;
  threshold: number | null;
  points: number;
}

export interface RiskConditions {
  time: string;
  temp: number | null;
  precip: number | null;
  precipProb: number | null;
  humidity: number | null;
  wind: number | null;
  weatherCode: number | null;
}

export interface RiskPoint {
  role: PointRole;
  latitude: number;
  longitude: number;
  conditions: RiskConditions;
  score: number;
  band: RiskBand;
  rules: FiredRule[];
}

export interface OutlookHour {
  at: string;
  score: number;
  band: RiskBand;
}

export interface RiskAssessment {
  departAt: string;
  assessedAt: string;
  timezone: string;
  units: WeatherUnits;
  score: number;
  band: RiskBand;
  rules: FiredRule[];
  advice: AdviceKey[];
  worstPoint: PointRole;
  points: RiskPoint[];
  suggestion: OutlookHour | null;
  outlook: OutlookHour[];
}

export interface RiskInput {
  lat: number;
  lon: number;
  toLat?: number;
  toLon?: number;
  departAt: string;
}

export const RISK_QUERY_KEY = ["analysis", "risk"] as const;

export const riskQueryKey = (input: RiskInput) =>
  [
    ...RISK_QUERY_KEY,
    input.lat,
    input.lon,
    input.toLat ?? null,
    input.toLon ?? null,
    input.departAt,
  ] as const;

export const assessRisk = (input: RiskInput) =>
  apiRequest<RiskAssessment>("/analysis/risk", {
    query: {
      lat: input.lat,
      lon: input.lon,
      to_lat: input.toLat,
      to_lon: input.toLon,
      depart_at: input.departAt,
    },
  });
