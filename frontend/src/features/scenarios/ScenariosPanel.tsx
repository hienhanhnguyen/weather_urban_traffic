"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { AREA_METRICS } from "@/features/areas/alerts";
import {
  deleteScenario,
  listScenarios,
  scenariosQueryKey,
  SCENARIOS_QUERY_KEY,
  type ResponseScenario,
} from "./api";
import {
  DEFAULT_FILTERS,
  isFiltered,
  SCENARIO_STATUSES,
  toScenarioQuery,
  type ScenarioFilters,
} from "./matching";
import { ScenarioDetail } from "./ScenarioDetail";
import { ScenarioEditor } from "./ScenarioEditor";
import { ScenarioStatusBadge } from "./ScenarioBadges";

type Editing = { scenario: ResponseScenario | null } | null;

export function ScenariosPanel() {
  const t = useTranslations("govScenarios");
  const tMetrics = useTranslations("areaAlerts.metrics");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ScenarioFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [doomed, setDoomed] = useState<ResponseScenario | null>(null);

  const query = useQuery({
    queryKey: scenariosQueryKey(toScenarioQuery(filters)),
    queryFn: () => listScenarios(toScenarioQuery(filters)),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteScenario(id),
    onSuccess: async (_result, id) => {
      await queryClient.invalidateQueries({ queryKey: SCENARIOS_QUERY_KEY });
      if (selectedId === id) setSelectedId(null);
      setDoomed(null);
    },
  });

  const scenarios = query.data ?? [];
  const selected = scenarios.find((entry) => entry.id === selectedId) ?? null;

  const change = (patch: Partial<ScenarioFilters>) =>
    setFilters((previous) => ({ ...previous, ...patch }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
        </div>

        {!editing && (
          <Button type="button" onClick={() => setEditing({ scenario: null })}>
            <FilePlus2 aria-hidden="true" className="size-4" />
            {t("new")}
          </Button>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label={t("filters.search")}
          type="search"
          value={filters.q}
          placeholder={t("filters.searchPlaceholder")}
          onChange={(event) => change({ q: event.target.value })}
        />

        <Select
          label={t("filters.status")}
          value={filters.status}
          options={[
            { value: "all", label: t("filters.all") },
            ...SCENARIO_STATUSES.map((status) => ({
              value: status,
              label: t(`statuses.${status}`),
            })),
          ]}
          onChange={(event) =>
            change({ status: event.target.value as ScenarioFilters["status"] })
          }
        />

        <Select
          label={t("filters.metric")}
          value={filters.metric}
          options={[
            { value: "all", label: t("filters.all") },
            { value: "any", label: t("anyMetric") },
            ...AREA_METRICS.map((metric) => ({
              value: metric,
              label: tMetrics(metric),
            })),
          ]}
          onChange={(event) =>
            change({ metric: event.target.value as ScenarioFilters["metric"] })
          }
        />
      </div>

      {isFiltered(filters) && (
        <button
          type="button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="self-start text-sm underline underline-offset-4"
        >
          {t("filters.reset")}
        </button>
      )}

      {query.isError && <Callout tone="error">{t("loadFailed")}</Callout>}

      {query.isPending && (
        <p className="text-sm opacity-70">{tCommon("loading")}</p>
      )}

      {editing && (
        <ScenarioEditor
          key={editing.scenario ? `scenario-${editing.scenario.id}` : "new"}
          scenario={editing.scenario}
          onSaved={(saved) => {
            setSelectedId(saved.id);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {query.isSuccess && scenarios.length === 0 && !editing && (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">
            {isFiltered(filters) ? t("emptyFiltered") : t("empty")}
          </p>
          <p className="mt-1 text-sm opacity-70">{t("emptyHint")}</p>
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <ul
            aria-busy={query.isPlaceholderData || undefined}
            className="divide-y divide-border overflow-hidden rounded-lg border border-border"
          >
            {scenarios.map((scenario) => (
              <li key={scenario.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(scenario.id)}
                  aria-current={scenario.id === selectedId || undefined}
                  className={
                    "flex w-full flex-col gap-1 p-4 text-left " +
                    "hover:bg-black/5 dark:hover:bg-white/10 " +
                    (scenario.id === selectedId
                      ? "bg-black/5 dark:bg-white/10"
                      : "")
                  }
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{scenario.name}</span>
                    <ScenarioStatusBadge status={scenario.status} />
                  </span>

                  <span className="text-sm opacity-70">
                    {scenario.metric
                      ? tMetrics(scenario.metric)
                      : t("anyMetric")}
                    {" · "}
                    {t("stepCount", { count: scenario.steps.length })}
                    {" · "}
                    {t("usage", { count: scenario.usageCount })}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <ScenarioDetail
              key={selected.id}
              scenario={selected}
              onEdit={() => setEditing({ scenario: selected })}
              onDelete={() => setDoomed(selected)}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm opacity-70">
              {t("noSelection")}
            </p>
          )}
        </div>
      )}

      <Modal
        open={doomed !== null}
        title={t("deleteTitle")}
        onClose={() => setDoomed(null)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm">{t("deleteBody", { name: doomed?.name ?? "" })}</p>

          {remove.isError && (
            <Callout tone="error">{tError("generic")}</Callout>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDoomed(null)}
            >
              {tCommon("cancel")}
            </Button>

            <Button
              type="button"
              loading={remove.isPending}
              onClick={() => doomed && remove.mutate(doomed.id)}
            >
              {t("delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
