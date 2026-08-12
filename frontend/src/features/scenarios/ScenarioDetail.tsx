"use client";

import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ResponseScenario } from "./api";
import { ScenarioStatusBadge } from "./ScenarioBadges";
import { ScenarioSteps } from "./ScenarioSteps";

export interface ScenarioDetailProps {
  scenario: ResponseScenario;
  onEdit: () => void;
  onDelete: () => void;
}

export function ScenarioDetail({
  scenario,
  onEdit,
  onDelete,
}: ScenarioDetailProps) {
  const t = useTranslations("govScenarios");
  const tMetrics = useTranslations("areaAlerts.metrics");
  const tSeverity = useTranslations("notifications.severities");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ScenarioStatusBadge status={scenario.status} />
          <span className="text-xs opacity-70">
            {t("usage", { count: scenario.usageCount })}
          </span>
        </div>

        <h2 className="text-base font-semibold">{scenario.name}</h2>

        {scenario.description && (
          <p className="text-sm opacity-80">{scenario.description}</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="opacity-60">{t("form.metric")}</dt>
          <dd className="font-medium">
            {scenario.metric ? tMetrics(scenario.metric) : t("anyMetric")}
          </dd>
        </div>

        <div>
          <dt className="opacity-60">{t("form.minSeverity")}</dt>
          <dd className="font-medium">{tSeverity(scenario.minSeverity)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t("checklist")}</h3>
        <ScenarioSteps steps={scenario.steps} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onEdit}>
          <Pencil aria-hidden="true" className="size-4" />
          {t("edit")}
        </Button>

        <Button type="button" variant="ghost" onClick={onDelete}>
          <Trash2 aria-hidden="true" className="size-4" />
          {t("delete")}
        </Button>
      </div>
    </div>
  );
}
