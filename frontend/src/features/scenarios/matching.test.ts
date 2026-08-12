import { describe, expect, it } from "vitest";
import type { Incident } from "@/features/incidents/api";
import type { ResponseScenario } from "./api";
import {
  addStep,
  covers,
  draftOf,
  draftProblem,
  editStep,
  emptyDraft,
  isFiltered,
  MAX_STEPS,
  moveStep,
  removeStep,
  scenarioPayload,
  splitForIncident,
  toScenarioQuery,
  DEFAULT_FILTERS,
} from "./matching";

const scenario = (
  overrides: Partial<ResponseScenario> = {},
): ResponseScenario => ({
  id: 1,
  name: "Heavy rain plan",
  description: null,
  metric: "precip",
  minSeverity: "warning",
  status: "active",
  usageCount: 0,
  steps: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

const incident = (
  overrides: Partial<Pick<Incident, "metric" | "severity">> = {},
) => ({ metric: "precip", severity: "critical" as const, ...overrides });

describe("covers", () => {
  it("matches on the metric and the severity floor", () => {
    expect(covers(scenario(), incident())).toBe(true);
    expect(covers(scenario(), incident({ severity: "warning" }))).toBe(true);
    expect(covers(scenario(), incident({ severity: "info" }))).toBe(false);
    expect(covers(scenario(), incident({ metric: "temp" }))).toBe(false);
  });

  it("treats a null metric as every metric", () => {
    const anyMetric = scenario({ metric: null, minSeverity: "info" });

    expect(covers(anyMetric, incident({ metric: "temp" }))).toBe(true);
    expect(covers(anyMetric, incident({ metric: null }))).toBe(true);
  });

  it("ignores a scenario that is not active", () => {
    expect(covers(scenario({ status: "draft" }), incident())).toBe(false);
    expect(covers(scenario({ status: "archived" }), incident())).toBe(false);
  });
});

describe("splitForIncident", () => {
  it("keeps the covering plans apart from the rest, in order", () => {
    const list = [
      scenario({ id: 1, name: "Rain" }),
      scenario({ id: 2, name: "Heat", metric: "temp" }),
      scenario({ id: 3, name: "Anything", metric: null }),
    ];

    const { matching, others } = splitForIncident(list, incident());

    expect(matching.map((entry) => entry.id)).toEqual([1, 3]);
    expect(others.map((entry) => entry.id)).toEqual([2]);
  });
});

describe("the draft editor", () => {
  it("starts a new plan with one blank step", () => {
    const draft = emptyDraft();

    expect(draft.name).toBe("");
    expect(draft.metric).toBe("any");
    expect(draft.steps).toHaveLength(1);
  });

  it("loads an existing plan, keeping the step order", () => {
    const draft = draftOf(
      scenario({
        description: "When it will not stop",
        metric: null,
        steps: [
          { id: 7, position: 1, content: "Open the pumps", priority: "high" },
          { id: 9, position: 2, content: "Warn the wards", priority: "low" },
        ],
      }),
    );

    expect(draft.metric).toBe("any");
    expect(draft.description).toBe("When it will not stop");
    expect(draft.steps.map((step) => step.content)).toEqual([
      "Open the pumps",
      "Warn the wards",
    ]);
  });

  it("gives an empty plan a blank step to type into", () => {
    expect(draftOf(scenario({ steps: [] })).steps).toHaveLength(1);
  });

  it("adds steps up to the cap and no further", () => {
    let draft = emptyDraft();
    for (let index = 0; index < MAX_STEPS + 5; index += 1) draft = addStep(draft);

    expect(draft.steps).toHaveLength(MAX_STEPS);
  });

  it("swaps neighbouring steps and refuses to move past either end", () => {
    let draft = addStep(addStep(emptyDraft()));
    const [first, second, third] = draft.steps.map((step) => step.key);

    draft = moveStep(draft, second, -1);
    expect(draft.steps.map((step) => step.key)).toEqual([second, first, third]);

    expect(moveStep(draft, second, -1).steps.map((step) => step.key)).toEqual([
      second,
      first,
      third,
    ]);
    expect(moveStep(draft, third, 1).steps.map((step) => step.key)).toEqual([
      second,
      first,
      third,
    ]);
  });

  it("never leaves the checklist with nothing to type into", () => {
    const draft = emptyDraft();

    expect(removeStep(draft, draft.steps[0].key).steps).toHaveLength(1);
  });

  it("edits one step without touching its neighbours", () => {
    let draft = addStep(emptyDraft());
    draft = editStep(draft, draft.steps[1].key, {
      content: "Warn the wards",
      priority: "high",
    });

    expect(draft.steps[0].content).toBe("");
    expect(draft.steps[1]).toMatchObject({
      content: "Warn the wards",
      priority: "high",
    });
  });
});

describe("draftProblem", () => {
  it("asks for a name", () => {
    expect(draftProblem({ ...emptyDraft(), name: "   " })).toBe("nameRequired");
  });

  it("accepts a plan whose only step is still blank", () => {
    expect(draftProblem({ ...emptyDraft(), name: "Rain" })).toBeNull();
  });

  it("rejects a step the backend would reject", () => {
    let draft = { ...emptyDraft(), name: "Rain" };
    draft = editStep(draft, draft.steps[0].key, { content: "x".repeat(501) });

    expect(draftProblem(draft)).toBe("stepTooLong");
  });
});

describe("scenarioPayload", () => {
  it("trims the plan and drops the steps left blank", () => {
    let draft = addStep({
      ...emptyDraft(),
      name: "  Heavy rain plan  ",
      description: "  ",
      metric: "precip",
      minSeverity: "critical",
    });
    draft = editStep(draft, draft.steps[0].key, {
      content: "  Open the pumps  ",
      priority: "high",
    });

    expect(scenarioPayload(draft)).toEqual({
      name: "Heavy rain plan",
      description: null,
      metric: "precip",
      min_severity: "critical",
      status: "active",
      steps: [{ content: "Open the pumps", priority: "high" }],
    });
  });

  it("sends a null metric when the plan covers anything", () => {
    expect(scenarioPayload({ ...emptyDraft(), name: "Any" }).metric).toBeNull();
  });
});

describe("the filter bar", () => {
  it("knows when nothing is filtered", () => {
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
    expect(isFiltered({ ...DEFAULT_FILTERS, q: "  " })).toBe(false);
    expect(isFiltered({ ...DEFAULT_FILTERS, status: "draft" })).toBe(true);
  });

  it("sends only the filters that were set", () => {
    expect(toScenarioQuery(DEFAULT_FILTERS)).toEqual({});
    expect(
      toScenarioQuery({ q: " rain ", status: "active", metric: "any" }),
    ).toEqual({ q: "rain", status: "active", metric: "any" });
  });
});
