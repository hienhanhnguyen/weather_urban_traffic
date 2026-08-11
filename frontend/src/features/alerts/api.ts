import { apiRequest } from "@/lib/api/client";
import type { AlertSeverity, Pagination } from "@/features/notifications/api";

export type { AlertSeverity };

export type AlertMetric = "temp" | "feelslike" | "precip" | "precipprob";
export type AlertOperator = ">" | ">=" | "<" | "<=";
export type AlertScope = "current" | "forecast_24h";

export interface AlertRule {
  id: number;
  locationId: number;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  unit: string | null;
  scope: AlertScope;
  severity: AlertSeverity;
  cooldownMinutes: number;
  isEnabled: boolean;
  lastTriggeredAt: string | null;
  lastValue: number | null;
}

export interface AlertRulePage {
  rules: AlertRule[];
  pagination: Pagination;
}

export interface AlertRuleInput {
  location_id: number;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  scope: AlertScope;
  severity: AlertSeverity;
  cooldown_minutes: number;
}

export const ALERT_RULES_QUERY_KEY = ["alerts", "rules"] as const;

export const locationRulesQueryKey = (locationId: number) =>
  [...ALERT_RULES_QUERY_KEY, "location", locationId] as const;

export const RULES_PAGE_SIZE = 100;

export const listRules = () =>
  apiRequest<AlertRulePage>("/alerts/rules", {
    query: { page: 1, limit: RULES_PAGE_SIZE },
  });

export const listLocationRules = (locationId: number) =>
  apiRequest<AlertRulePage>("/alerts/rules", {
    query: { location_id: locationId, page: 1, limit: RULES_PAGE_SIZE },
  });

export const createRule = (body: AlertRuleInput) =>
  apiRequest<{ rule: AlertRule }>("/alerts/rules", {
    method: "POST",
    body,
  }).then((response) => response.rule);

export const updateRule = (
  id: number,
  body: Partial<AlertRuleInput> & { is_enabled?: boolean },
) =>
  apiRequest<{ rule: AlertRule }>(`/alerts/rules/${id}`, {
    method: "PATCH",
    body,
  }).then((response) => response.rule);

export const deleteRule = (id: number) =>
  apiRequest<void>(`/alerts/rules/${id}`, { method: "DELETE" });
