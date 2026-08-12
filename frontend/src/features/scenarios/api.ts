import { apiRequest } from "@/lib/api/client";
import type { AlertSeverity } from "@/features/notifications/api";
import type { AreaMetric } from "@/features/areas/alerts-api";

export type ScenarioStatus = "draft" | "active" | "archived";

export type ScenarioPriority = "high" | "medium" | "low";

export interface ScenarioStep {
  id: number;
  position: number;
  content: string;
  priority: ScenarioPriority;
}

export interface ResponseScenario {
  id: number;
  name: string;
  description: string | null;
  metric: AreaMetric | null;
  minSeverity: AlertSeverity;
  status: ScenarioStatus;
  usageCount: number;
  steps: ScenarioStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioBody {
  name: string;
  description: string | null;
  metric: AreaMetric | null;
  min_severity: AlertSeverity;
  status: ScenarioStatus;
  steps: { content: string; priority: ScenarioPriority }[];
}

export type ScenarioQuery = {
  q?: string;
  status?: ScenarioStatus;
  metric?: AreaMetric | "any";
};

export const SCENARIOS_QUERY_KEY = ["gov", "scenarios"] as const;

export const scenariosQueryKey = (query: ScenarioQuery = {}) =>
  [...SCENARIOS_QUERY_KEY, "list", query] as const;

export const listScenarios = (query: ScenarioQuery = {}) =>
  apiRequest<{ scenarios: ResponseScenario[] }>("/gov/scenarios", {
    query,
  }).then((response) => response.scenarios);

export const createScenario = (body: ScenarioBody) =>
  apiRequest<{ scenario: ResponseScenario }>("/gov/scenarios", {
    method: "POST",
    body,
  }).then((response) => response.scenario);

export const updateScenario = (id: number, body: ScenarioBody) =>
  apiRequest<{ scenario: ResponseScenario }>(`/gov/scenarios/${id}`, {
    method: "PUT",
    body,
  }).then((response) => response.scenario);

export const deleteScenario = (id: number) =>
  apiRequest<void>(`/gov/scenarios/${id}`, { method: "DELETE" });
