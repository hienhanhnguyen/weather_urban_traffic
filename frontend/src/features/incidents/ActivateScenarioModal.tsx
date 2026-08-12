"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import {
  listScenarios,
  scenariosQueryKey,
  type ResponseScenario,
} from "@/features/scenarios/api";
import { splitForIncident } from "@/features/scenarios/matching";
import { ScenarioStatusBadge } from "@/features/scenarios/ScenarioBadges";
import { activateIncidentScenario, type Incident } from "./api";

const ACTIVE_ONLY = { status: "active" } as const;

export interface ActivateScenarioModalProps {
  incident: Incident;
  onClose: () => void;
  onActivated: () => void;
}

export function ActivateScenarioModal({
  incident,
  onClose,
  onActivated,
}: ActivateScenarioModalProps) {
  const t = useTranslations("govScenarios.activate");
  const tScenarios = useTranslations("govScenarios");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");

  const [chosenId, setChosenId] = useState<number | null>(incident.scenarioId);

  const query = useQuery({
    queryKey: scenariosQueryKey(ACTIVE_ONLY),
    queryFn: () => listScenarios(ACTIVE_ONLY),
  });

  const activate = useMutation({
    mutationFn: (scenarioId: number | null) =>
      activateIncidentScenario(incident.id, scenarioId),
    onSuccess: onActivated,
  });

  const { matching, others } = splitForIncident(query.data ?? [], incident);

  const option = (scenario: ResponseScenario) => (
    <li key={scenario.id}>
      <label
        className={
          "flex cursor-pointer items-start gap-3 rounded-md border p-3 " +
          (chosenId === scenario.id
            ? "border-sky-600 bg-sky-500/5"
            : "border-border")
        }
      >
        <input
          type="radio"
          name="scenario"
          value={scenario.id}
          checked={chosenId === scenario.id}
          onChange={() => setChosenId(scenario.id)}
          className="mt-1"
        />

        <span className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{scenario.name}</span>
            <ScenarioStatusBadge status={scenario.status} />
          </span>

          <span className="text-sm opacity-70">
            {tScenarios("stepCount", { count: scenario.steps.length })}
            {scenario.description ? ` · ${scenario.description}` : ""}
          </span>
        </span>
      </label>
    </li>
  );

  return (
    <Modal open title={t("title")} size="lg" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm opacity-80">{t("subtitle")}</p>

        {query.isError && (
          <Callout tone="error">{tScenarios("loadFailed")}</Callout>
        )}

        {query.isPending && (
          <p className="text-sm opacity-70">{tCommon("loading")}</p>
        )}

        {query.isSuccess && matching.length + others.length === 0 && (
          <Callout tone="info">{t("none")}</Callout>
        )}

        {matching.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t("matching")}</h3>
            <ul className="flex flex-col gap-2">{matching.map(option)}</ul>
          </div>
        )}

        {others.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t("others")}</h3>
            <p className="text-sm opacity-70">{t("othersHint")}</p>
            <ul className="flex flex-col gap-2">{others.map(option)}</ul>
          </div>
        )}

        {activate.isError && <Callout tone="error">{tError("generic")}</Callout>}

        <div className="flex flex-wrap justify-end gap-2">
          {incident.scenarioId !== null && (
            <Button
              type="button"
              variant="ghost"
              loading={activate.isPending && activate.variables === null}
              onClick={() => activate.mutate(null)}
            >
              {t("clear")}
            </Button>
          )}

          <Button type="button" variant="secondary" onClick={onClose}>
            {tCommon("cancel")}
          </Button>

          <Button
            type="button"
            disabled={chosenId === null}
            loading={activate.isPending && activate.variables !== null}
            onClick={() => chosenId !== null && activate.mutate(chosenId)}
          >
            {t("confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
