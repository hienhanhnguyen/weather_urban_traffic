"use client";

import { useTranslations } from "next-intl";
import { TextField } from "@/components/ui/TextField";
import type { DateRange } from "./filters";

export interface DateRangeFieldsProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
  rangeError?: string;
}

export function DateRangeFields({
  range,
  onChange,
  rangeError,
}: DateRangeFieldsProps) {
  const t = useTranslations("history.filters");

  return (
    <>
      <TextField
        type="date"
        label={t("from")}
        value={range.from}
        max={range.to || undefined}
        onChange={(event) => onChange({ ...range, from: event.target.value })}
      />

      <TextField
        type="date"
        label={t("to")}
        value={range.to}
        min={range.from || undefined}
        error={rangeError}
        onChange={(event) => onChange({ ...range, to: event.target.value })}
      />
    </>
  );
}
