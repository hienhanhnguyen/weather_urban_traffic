"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { AREA_METRICS, METRIC_UNIT } from "@/features/areas/alerts";
import type { AreaMetric } from "@/features/areas/alerts-api";
import { ScenarioSteps } from "@/features/scenarios/ScenarioSteps";
import {
  getIncident,
  incidentQueryKey,
  updateIncidentStatus,
  type Incident,
  type IncidentStatus,
} from "./api";
import { ActivateScenarioModal } from "./ActivateScenarioModal";
import { nextStatuses } from "./filters";
import { SeverityBadge, StatusBadge } from "./StatusBadge";

const isAreaMetric = (metric: string | null): metric is AreaMetric =>
  metric !== null && AREA_METRICS.includes(metric as AreaMetric);

export interface IncidentDetailProps {
  incident: Incident;
  onUpdated: (incident: Incident) => void;
}

export function IncidentDetail({ incident, onUpdated }: IncidentDetailProps) {
  const t = useTranslations("govIncidents");
  const tMetrics = useTranslations("areaAlerts.metrics");
  const tPlan = useTranslations("govScenarios.activate");
  const tError = useTranslations("errors");
  const format = useFormatter();
  const queryClient = useQueryClient();

  const [note, setNote] = useState(incident.handledNote ?? "");
  const [picking, setPicking] = useState(false);

  // The list response carries the plan's name; the checklist itself only comes
  // with the incident's own record.
  const plan = useQuery({
    queryKey: incidentQueryKey(incident.id),
    queryFn: () => getIncident(incident.id),
  });

  const move = useMutation({
    mutationFn: (status: IncidentStatus) =>
      updateIncidentStatus(incident.id, { status, note }),
    onSuccess: onUpdated,
  });

  const createdAt = new Date(incident.createdAt);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>

        <h2 className="text-base font-semibold">{incident.title}</h2>

        {incident.body && <p className="text-sm opacity-80">{incident.body}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="opacity-60">{t("detail.area")}</dt>
          <dd className="font-medium">{incident.areaName ?? "—"}</dd>
        </div>

        <div>
          <dt className="opacity-60">{t("detail.raisedAt")}</dt>
          <dd className="font-medium">
            <time dateTime={incident.createdAt}>
              {format.dateTime(createdAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </dd>
        </div>

        {isAreaMetric(incident.metric) && incident.value !== null && (
          <div>
            <dt className="opacity-60">{tMetrics(incident.metric)}</dt>
            <dd className="font-medium tabular-nums">
              {format.number(incident.value)} {METRIC_UNIT[incident.metric]}
            </dd>
          </div>
        )}

        {incident.handledAt && (
          <div>
            <dt className="opacity-60">{t("detail.handledAt")}</dt>
            <dd className="font-medium">
              <time dateTime={incident.handledAt}>
                {format.dateTime(new Date(incident.handledAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="incident-note" className="text-sm font-medium">
          {t("detail.note")}
        </label>

        <textarea
          id="incident-note"
          rows={3}
          value={note}
          maxLength={500}
          placeholder={t("detail.notePlaceholder")}
          onChange={(event) => setNote(event.target.value)}
          className={
            "rounded-md border border-black/15 bg-transparent px-3 py-2 " +
            "text-sm outline-none focus:border-sky-600 focus:ring-2 " +
            "focus:ring-sky-600/40 dark:border-white/20"
          }
        />

        <p className="text-sm opacity-70">{t("detail.noteHint")}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-md border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{tPlan("planTitle")}</h3>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setPicking(true)}
          >
            <ClipboardList aria-hidden="true" className="size-4" />
            {incident.scenarioId === null
              ? tPlan("activate")
              : tPlan("change")}
          </Button>
        </div>

        {incident.scenarioId === null ? (
          <p className="text-sm opacity-70">{tPlan("noPlan")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {plan.data?.scenario?.name ?? incident.scenarioName}
            </p>

            {incident.activatedAt && (
              <p className="text-sm opacity-70">
                {tPlan("activatedAt", {
                  when: format.dateTime(new Date(incident.activatedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
              </p>
            )}

            {plan.data?.scenario && (
              <ScenarioSteps steps={plan.data.scenario.steps} />
            )}
          </div>
        )}
      </section>

      {move.isError && <Callout tone="error">{tError("generic")}</Callout>}

      <div className="flex flex-wrap gap-2">
        {nextStatuses(incident.status).map((status, index) => (
          <Button
            key={status}
            type="button"
            variant={index === 0 ? "primary" : "secondary"}
            loading={move.isPending && move.variables === status}
            disabled={move.isPending}
            onClick={() => move.mutate(status)}
          >
            {t(`actions.${status}`)}
          </Button>
        ))}
      </div>

      {picking && (
        <ActivateScenarioModal
          incident={incident}
          onClose={() => setPicking(false)}
          onActivated={async () => {
            setPicking(false);
            await queryClient.invalidateQueries({
              queryKey: incidentQueryKey(incident.id),
            });
            onUpdated(incident);
          }}
        />
      )}
    </div>
  );
}
