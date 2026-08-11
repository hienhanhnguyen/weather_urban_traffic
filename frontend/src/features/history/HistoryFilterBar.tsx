"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Select";
import { DateRangeFields } from "./DateRangeFields";
import {
  READ_FILTERS,
  SEVERITY_FILTERS,
  type HistoryFilters,
  type ReadFilter,
  type SeverityFilter,
} from "./filters";

export interface HistoryFilterBarProps {
  filters: HistoryFilters;
  onChange: (filters: HistoryFilters) => void;
  onReset: () => void;
  showReset: boolean;
  rangeError?: string;
}

export function HistoryFilterBar({
  filters,
  onChange,
  onReset,
  showReset,
  rangeError,
}: HistoryFilterBarProps) {
  const t = useTranslations("history");
  const tSeverity = useTranslations("notifications.severities");
  const tCommon = useTranslations("common");

  const patch = (values: Partial<HistoryFilters>) =>
    onChange({ ...filters, ...values });

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        label={t("filters.status")}
        value={filters.read}
        onChange={(event) =>
          patch({ read: event.target.value as ReadFilter })
        }
        options={READ_FILTERS.map((value) => ({
          value,
          label: t(`status.${value}`),
        }))}
      />

      <Select
        label={t("filters.severity")}
        value={filters.severity}
        onChange={(event) =>
          patch({ severity: event.target.value as SeverityFilter })
        }
        options={SEVERITY_FILTERS.map((value) => ({
          value,
          label: value === "all" ? t("status.all") : tSeverity(value),
        }))}
      />

      <DateRangeFields
        range={filters}
        onChange={patch}
        rangeError={rangeError}
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
