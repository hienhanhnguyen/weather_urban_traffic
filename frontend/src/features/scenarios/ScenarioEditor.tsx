"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { isApiError } from "@/lib/api/errors";
import { AREA_METRICS } from "@/features/areas/alerts";
import { SEVERITIES } from "@/features/alerts/format";
import {
  createScenario,
  SCENARIOS_QUERY_KEY,
  updateScenario,
  type ResponseScenario,
} from "./api";
import {
  addStep,
  draftOf,
  draftProblem,
  editStep,
  emptyDraft,
  MAX_STEPS,
  MAX_STEP_LENGTH,
  moveStep,
  removeStep,
  scenarioPayload,
  SCENARIO_PRIORITIES,
  SCENARIO_STATUSES,
} from "./matching";

export interface ScenarioEditorProps {
  scenario: ResponseScenario | null;
  onSaved: (scenario: ResponseScenario) => void;
  onCancel: () => void;
}

export function ScenarioEditor({
  scenario,
  onSaved,
  onCancel,
}: ScenarioEditorProps) {
  const t = useTranslations("govScenarios");
  const tMetrics = useTranslations("areaAlerts.metrics");
  const tSeverity = useTranslations("notifications.severities");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState(() =>
    scenario ? draftOf(scenario) : emptyDraft(),
  );

  const problem = draftProblem(draft);

  const save = useMutation({
    mutationFn: () =>
      scenario
        ? updateScenario(scenario.id, scenarioPayload(draft))
        : createScenario(scenarioPayload(draft)),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: SCENARIOS_QUERY_KEY });
      onSaved(saved);
    },
  });

  const nameTaken =
    isApiError(save.error) && save.error.code === "SCENARIO_NAME_TAKEN";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!problem) save.mutate();
      }}
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <h2 className="text-base font-semibold">
        {scenario ? t("editTitle") : t("newTitle")}
      </h2>

      <TextField
        label={t("form.name")}
        value={draft.name}
        maxLength={120}
        required
        placeholder={t("form.namePlaceholder")}
        onChange={(event) =>
          setDraft((previous) => ({ ...previous, name: event.target.value }))
        }
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="scenario-description" className="text-sm font-medium">
          {t("form.description")}
        </label>

        <textarea
          id="scenario-description"
          rows={2}
          value={draft.description}
          maxLength={1000}
          placeholder={t("form.descriptionPlaceholder")}
          onChange={(event) =>
            setDraft((previous) => ({
              ...previous,
              description: event.target.value,
            }))
          }
          className={
            "rounded-md border border-black/15 bg-transparent px-3 py-2 " +
            "text-sm outline-none focus:border-sky-600 focus:ring-2 " +
            "focus:ring-sky-600/40 dark:border-white/20"
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label={t("form.metric")}
          value={draft.metric}
          hint={t("form.metricHint")}
          options={[
            { value: "any", label: t("anyMetric") },
            ...AREA_METRICS.map((metric) => ({
              value: metric,
              label: tMetrics(metric),
            })),
          ]}
          onChange={(event) =>
            setDraft((previous) => ({
              ...previous,
              metric: event.target.value as typeof previous.metric,
            }))
          }
        />

        <Select
          label={t("form.minSeverity")}
          value={draft.minSeverity}
          options={SEVERITIES.map((severity) => ({
            value: severity,
            label: tSeverity(severity),
          }))}
          onChange={(event) =>
            setDraft((previous) => ({
              ...previous,
              minSeverity: event.target.value as typeof previous.minSeverity,
            }))
          }
        />

        <Select
          label={t("form.status")}
          value={draft.status}
          options={SCENARIO_STATUSES.map((status) => ({
            value: status,
            label: t(`statuses.${status}`),
          }))}
          onChange={(event) =>
            setDraft((previous) => ({
              ...previous,
              status: event.target.value as typeof previous.status,
            }))
          }
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">{t("form.steps")}</legend>

        <p className="text-sm opacity-70">{t("form.stepsHint")}</p>

        {draft.steps.map((step, index) => (
          <div
            key={step.key}
            className="flex flex-col gap-2 rounded-md border border-border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium tabular-nums">
                {t("form.step", { position: index + 1 })}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={t("form.moveUp")}
                  disabled={index === 0}
                  onClick={() =>
                    setDraft((previous) => moveStep(previous, step.key, -1))
                  }
                  className="rounded-md p-1.5 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>

                <button
                  type="button"
                  aria-label={t("form.moveDown")}
                  disabled={index === draft.steps.length - 1}
                  onClick={() =>
                    setDraft((previous) => moveStep(previous, step.key, 1))
                  }
                  className="rounded-md p-1.5 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </button>

                <button
                  type="button"
                  aria-label={t("form.removeStep")}
                  onClick={() =>
                    setDraft((previous) => removeStep(previous, step.key))
                  }
                  className="rounded-md p-1.5 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            <textarea
              rows={2}
              value={step.content}
              maxLength={MAX_STEP_LENGTH}
              aria-label={t("form.step", { position: index + 1 })}
              placeholder={t("form.stepPlaceholder")}
              onChange={(event) =>
                setDraft((previous) =>
                  editStep(previous, step.key, {
                    content: event.target.value,
                  }),
                )
              }
              className={
                "rounded-md border border-black/15 bg-transparent px-3 py-2 " +
                "text-sm outline-none focus:border-sky-600 focus:ring-2 " +
                "focus:ring-sky-600/40 dark:border-white/20"
              }
            />

            <Select
              label={t("form.priority")}
              value={step.priority}
              options={SCENARIO_PRIORITIES.map((priority) => ({
                value: priority,
                label: t(`priorities.${priority}`),
              }))}
              onChange={(event) =>
                setDraft((previous) =>
                  editStep(previous, step.key, {
                    priority: event.target.value as typeof step.priority,
                  }),
                )
              }
            />
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          disabled={draft.steps.length >= MAX_STEPS}
          onClick={() => setDraft(addStep)}
          className="self-start"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t("form.addStep")}
        </Button>
      </fieldset>

      {problem && <Callout tone="info">{t(`problems.${problem}`)}</Callout>}

      {save.isError && (
        <Callout tone="error">
          {nameTaken ? t("problems.nameTaken") : tError("generic")}
        </Callout>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={save.isPending} disabled={!!problem}>
          <Save aria-hidden="true" className="size-4" />
          {tCommon("save")}
        </Button>

        <Button type="button" variant="secondary" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}
