import type { AreaMetric } from "@/features/areas/alerts-api";
import type { AlertSeverity } from "@/features/notifications/api";
import type { Incident } from "@/features/incidents/api";
import type {
  ResponseScenario,
  ScenarioBody,
  ScenarioPriority,
  ScenarioStatus,
} from "./api";

export const SCENARIO_STATUSES: readonly ScenarioStatus[] = [
  "active",
  "draft",
  "archived",
];

export const SCENARIO_PRIORITIES: readonly ScenarioPriority[] = [
  "high",
  "medium",
  "low",
];

export const MAX_STEPS = 20;

export const MAX_STEP_LENGTH = 500;

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

export function covers(
  scenario: ResponseScenario,
  incident: Pick<Incident, "metric" | "severity">,
): boolean {
  if (scenario.status !== "active") return false;
  if (scenario.metric !== null && scenario.metric !== incident.metric) {
    return false;
  }

  return (
    SEVERITY_RANK[incident.severity] >= SEVERITY_RANK[scenario.minSeverity]
  );
}

export function splitForIncident(
  scenarios: ResponseScenario[],
  incident: Pick<Incident, "metric" | "severity">,
) {
  const matching: ResponseScenario[] = [];
  const others: ResponseScenario[] = [];

  for (const scenario of scenarios) {
    (covers(scenario, incident) ? matching : others).push(scenario);
  }

  return { matching, others };
}

export interface DraftStep {
  key: string;
  content: string;
  priority: ScenarioPriority;
}

export interface ScenarioDraft {
  name: string;
  description: string;
  metric: AreaMetric | "any";
  minSeverity: AlertSeverity;
  status: ScenarioStatus;
  steps: DraftStep[];
}

let nextKey = 0;
const stepKey = () => `step-${(nextKey += 1)}`;

export const blankStep = (): DraftStep => ({
  key: stepKey(),
  content: "",
  priority: "medium",
});

export const emptyDraft = (): ScenarioDraft => ({
  name: "",
  description: "",
  metric: "any",
  minSeverity: "warning",
  status: "active",
  steps: [blankStep()],
});

export const draftOf = (scenario: ResponseScenario): ScenarioDraft => ({
  name: scenario.name,
  description: scenario.description ?? "",
  metric: scenario.metric ?? "any",
  minSeverity: scenario.minSeverity,
  status: scenario.status,
  steps:
    scenario.steps.length === 0
      ? [blankStep()]
      : scenario.steps.map((step) => ({
          key: `step-${step.id}`,
          content: step.content,
          priority: step.priority,
        })),
});

export const addStep = (draft: ScenarioDraft): ScenarioDraft =>
  draft.steps.length >= MAX_STEPS
    ? draft
    : { ...draft, steps: [...draft.steps, blankStep()] };

export const removeStep = (draft: ScenarioDraft, key: string): ScenarioDraft => {
  const steps = draft.steps.filter((step) => step.key !== key);

  return { ...draft, steps: steps.length === 0 ? [blankStep()] : steps };
};

export function moveStep(
  draft: ScenarioDraft,
  key: string,
  offset: number,
): ScenarioDraft {
  const from = draft.steps.findIndex((step) => step.key === key);
  const to = from + offset;

  if (from < 0 || to < 0 || to >= draft.steps.length) return draft;

  const steps = [...draft.steps];
  [steps[from], steps[to]] = [steps[to], steps[from]];

  return { ...draft, steps };
}

export const editStep = (
  draft: ScenarioDraft,
  key: string,
  patch: Partial<Omit<DraftStep, "key">>,
): ScenarioDraft => ({
  ...draft,
  steps: draft.steps.map((step) =>
    step.key === key ? { ...step, ...patch } : step,
  ),
});

export type DraftProblem = "nameRequired" | "stepTooLong";

export function draftProblem(draft: ScenarioDraft): DraftProblem | null {
  if (draft.name.trim().length === 0) return "nameRequired";

  const tooLong = draft.steps.some(
    (step) => step.content.trim().length > MAX_STEP_LENGTH,
  );

  return tooLong ? "stepTooLong" : null;
}

export const scenarioPayload = (draft: ScenarioDraft): ScenarioBody => ({
  name: draft.name.trim(),
  description: draft.description.trim() || null,
  metric: draft.metric === "any" ? null : draft.metric,
  min_severity: draft.minSeverity,
  status: draft.status,
  steps: draft.steps
    .filter((step) => step.content.trim().length > 0)
    .map((step) => ({ content: step.content.trim(), priority: step.priority })),
});

export interface ScenarioFilters {
  q: string;
  status: ScenarioStatus | "all";
  metric: AreaMetric | "any" | "all";
}

export const DEFAULT_FILTERS: ScenarioFilters = {
  q: "",
  status: "all",
  metric: "all",
};

export const isFiltered = (filters: ScenarioFilters) =>
  filters.q.trim().length > 0 ||
  filters.status !== "all" ||
  filters.metric !== "all";

export const toScenarioQuery = (filters: ScenarioFilters) => ({
  ...(filters.q.trim() && { q: filters.q.trim() }),
  ...(filters.status !== "all" && { status: filters.status }),
  ...(filters.metric !== "all" && { metric: filters.metric }),
});
