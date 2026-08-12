"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Select";
import type { ManagedArea } from "@/features/areas/api";
import {
  ALL_AREAS,
  SEVERITY_FILTERS,
  STATUS_FILTERS,
  TIMEFRAMES,
  areaSelectValue,
  parseAreaId,
  type IncidentFilters,
  type SeverityFilter,
  type StatusFilter,
  type Timeframe,
} from "./filters";

export interface IncidentFilterBarProps {
  filters: IncidentFilters;
  areas: ManagedArea[];
  onChange: (filters: IncidentFilters) => void;
  onReset: () => void;
  showReset: boolean;
}

export function IncidentFilterBar({
  filters,
  areas,
  onChange,
  onReset,
  showReset,
}: IncidentFilterBarProps) {
  const t = useTranslations("govIncidents");
  const tSeverity = useTranslations("notifications.severities");
  const tCommon = useTranslations("common");

  const patch = (values: Partial<IncidentFilters>) =>
    onChange({ ...filters, ...values });

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        label={t("filters.timeframe")}
        value={filters.timeframe}
        onChange={(event) =>
          patch({ timeframe: event.target.value as Timeframe })
        }
        options={TIMEFRAMES.map((value) => ({
          value,
          label: t(`timeframes.${value}`),
        }))}
      />

      <Select
        label={t("filters.area")}
        value={areaSelectValue(filters.areaId)}
        onChange={(event) => patch({ areaId: parseAreaId(event.target.value) })}
        options={[
          { value: ALL_AREAS, label: t("filters.allAreas") },
          ...areas.map((area) => ({
            value: String(area.id),
            label: area.name,
          })),
        ]}
      />

      <Select
        label={t("filters.severity")}
        value={filters.severity}
        onChange={(event) =>
          patch({ severity: event.target.value as SeverityFilter })
        }
        options={SEVERITY_FILTERS.map((value) => ({
          value,
          label: value === "all" ? t("filters.all") : tSeverity(value),
        }))}
      />

      <Select
        label={t("filters.status")}
        value={filters.status}
        onChange={(event) =>
          patch({ status: event.target.value as StatusFilter })
        }
        options={STATUS_FILTERS.map((value) => ({
          value,
          label: value === "all" ? t("filters.all") : t(`statuses.${value}`),
        }))}
      />

      {showReset && (
        <button
          type="button"
          onClick={onReset}
          className="justify-self-start text-sm underline underline-offset-4 sm:col-span-2 lg:col-span-4"
        >
          {tCommon("clear")}
        </button>
      )}
    </div>
  );
}
