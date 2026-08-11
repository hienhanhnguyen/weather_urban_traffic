"use client";

import { useState } from "react";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { isApiError } from "@/lib/api/errors";
import {
  RISK_QUERY_KEY,
  assessRisk,
  riskQueryKey,
  type RiskInput,
} from "./api";
import { checkDeparture, fromLocalInput, toLocalInput } from "./format";
import {
  RiskForm,
  emptyForm,
  type RiskFormErrors,
  type RiskFormState,
} from "./RiskForm";
import { RiskResult } from "./RiskResult";

const STALE_TIME = 5 * 60 * 1000;

export function RiskPanel() {
  const t = useTranslations("risk");
  const tErrors = useTranslations("risk.errors");
  const tCommon = useTranslations("errors");

  const [form, setForm] = useState<RiskFormState>(emptyForm);
  const [errors, setErrors] = useState<RiskFormErrors>({});
  const [asked, setAsked] = useState<RiskInput | null>(null);

  const query = useQuery({
    queryKey: asked ? riskQueryKey(asked) : RISK_QUERY_KEY,
    queryFn: asked ? () => assessRisk(asked) : skipToken,
    staleTime: STALE_TIME,
  });

  const submit = (state: RiskFormState) => {
    const next: RiskFormErrors = {};

    if (!state.start) next.start = tErrors("startRequired");

    const departAt =
      state.mode === "now" ? new Date() : fromLocalInput(state.departure);

    if (state.mode === "scheduled") {
      const problem = checkDeparture(state.departure, new Date());
      if (problem) next.departure = tErrors(`departure_${problem}`);
    }

    setErrors(next);

    if (!state.start || !departAt || Object.keys(next).length > 0) return;

    setAsked({
      lat: state.start.latitude,
      lon: state.start.longitude,
      toLat: state.end?.latitude,
      toLon: state.end?.longitude,
      departAt: departAt.toISOString(),
    });
  };

  const useSuggestion = (at: string) => {
    const state: RiskFormState = {
      ...form,
      mode: "scheduled",
      departure: toLocalInput(new Date(at)),
    };

    setForm(state);
    submit(state);
  };

  const failure = query.error;
  const outsideWindow =
    isApiError(failure) && failure.code === "OUTSIDE_FORECAST_WINDOW";

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
      </header>

      <RiskForm
        value={form}
        onChange={setForm}
        errors={errors}
        onSubmit={submit}
        pending={query.isFetching}
      />

      {failure && (
        <Callout tone="error">
          {outsideWindow
            ? tErrors("outsideWindow")
            : isApiError(failure)
              ? failure.message
              : tCommon("generic")}
        </Callout>
      )}

      {query.data ? (
        <RiskResult result={query.data} onUseSuggestion={useSuggestion} />
      ) : (
        !asked && (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm opacity-70">
            {t("empty")}
          </p>
        )
      )}
    </div>
  );
}
