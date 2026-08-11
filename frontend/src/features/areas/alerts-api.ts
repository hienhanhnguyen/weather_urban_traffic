import { apiRequest } from "@/lib/api/client";
import type { AlertSeverity } from "@/features/notifications/api";

export type AreaMetric = "temp" | "feelslike" | "precip" | "precipprob";

export type SkipReason =
  | "disabled"
  | "cooldown"
  | "no_data"
  | "below_threshold";

export interface AreaAlertRule {
  id: number;
  areaId: number;
  metric: AreaMetric;
  threshold: number;
  unit: string;
  severity: AlertSeverity;
  cooldownMinutes: number;
  isEnabled: boolean;
  lastTriggeredAt: string | null;
  lastValue: number | null;
}

export interface AreaAlertRuleInput {
  metric: AreaMetric;
  threshold: number;
  severity: AlertSeverity;
  cooldown_minutes: number;
  is_enabled: boolean;
}

export interface EvaluationHit {
  metric: AreaMetric;
  value: number;
  threshold: number;
  unit: string;
}

export interface EvaluationSkip {
  metric: AreaMetric;
  reason: SkipReason;
  value?: number;
}

export interface EvaluationReport {
  fired: EvaluationHit[];
  skipped: EvaluationSkip[];
}

export const areaAlertsQueryKey = (areaId: number) =>
  ["gov", "areas", areaId, "alerts"] as const;

export const listAreaRules = (areaId: number) =>
  apiRequest<{ rules: AreaAlertRule[] }>(`/gov/areas/${areaId}/alerts`).then(
    (response) => response.rules,
  );

export const replaceAreaRules = (areaId: number, rules: AreaAlertRuleInput[]) =>
  apiRequest<{ rules: AreaAlertRule[] }>(`/gov/areas/${areaId}/alerts`, {
    method: "PUT",
    body: { rules },
  }).then((response) => response.rules);

export const evaluateAreaRules = (areaId: number, force = false) =>
  apiRequest<EvaluationReport>(`/gov/areas/${areaId}/alerts/evaluate`, {
    method: "POST",
    body: { force },
  });
