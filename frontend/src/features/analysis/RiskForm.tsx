"use client";

import { useTranslations } from "next-intl";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { PlaceField, type RiskPlace } from "./PlaceField";
import { nextHour, toLocalInput } from "./format";

export type DepartureMode = "now" | "scheduled";

export interface RiskFormState {
  start: RiskPlace | null;
  end: RiskPlace | null;
  mode: DepartureMode;
  departure: string;
}

export interface RiskFormErrors {
  start?: string;
  departure?: string;
}

export const emptyForm: RiskFormState = {
  start: null,
  end: null,
  mode: "now",
  departure: "",
};

export function RiskForm({
  value,
  onChange,
  errors,
  onSubmit,
  pending,
}: {
  value: RiskFormState;
  onChange: (next: RiskFormState) => void;
  errors: RiskFormErrors;
  onSubmit: (state: RiskFormState) => void;
  pending: boolean;
}) {
  const t = useTranslations("risk.form");

  const patch = (fields: Partial<RiskFormState>) =>
    onChange({ ...value, ...fields });

  const chooseMode = (mode: DepartureMode) =>
    patch({
      mode,
      departure:
        mode === "scheduled" && value.departure === ""
          ? toLocalInput(nextHour(new Date()))
          : value.departure,
    });

  return (
    <form
      className="flex flex-col gap-5 rounded-lg border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <PlaceField
          label={t("start")}
          placeholder={t("startPlaceholder")}
          value={value.start}
          onChange={(start) => patch({ start })}
          error={errors.start}
        />

        <PlaceField
          label={t("destination")}
          placeholder={t("destinationPlaceholder")}
          value={value.end}
          onChange={(end) => patch({ end })}
          onClear={() => patch({ end: null })}
        />
      </div>

      <p className="-mt-3 text-sm opacity-70">{t("destinationHint")}</p>

      <div className="flex flex-wrap items-start gap-4">
        <Select
          label={t("when")}
          value={value.mode}
          onChange={(event) => chooseMode(event.target.value as DepartureMode)}
          options={[
            { value: "now", label: t("whenNow") },
            { value: "scheduled", label: t("whenScheduled") },
          ]}
        />

        {value.mode === "scheduled" && (
          <TextField
            type="datetime-local"
            label={t("departure")}
            value={value.departure}
            onChange={(event) => patch({ departure: event.target.value })}
            error={errors.departure}
            hint={t("departureHint")}
          />
        )}
      </div>

      <div>
        <Button type="submit" loading={pending}>
          <Gauge aria-hidden="true" className="size-4" />
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
