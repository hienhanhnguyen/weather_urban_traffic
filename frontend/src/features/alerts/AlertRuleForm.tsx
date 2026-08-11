"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { PREFERENCES_QUERY_KEY, getPreferences } from "@/features/account/api";
import {
  ALERT_RULES_QUERY_KEY,
  createRule,
  updateRule,
  type AlertRule,
} from "./api";
import {
  DEFAULT_UNIT,
  METRICS,
  OPERATORS,
  SCOPES,
  SEVERITIES,
  isMuted,
  unitLabel,
} from "./format";
import { ruleSchema, type RuleValues } from "./schemas";

const FIELDS = [
  "metric",
  "operator",
  "threshold",
  "scope",
  "severity",
] as const;

const PREFERENCES_STALE_TIME = 5 * 60 * 1000;

const defaultsFor = (rule: AlertRule | null): RuleValues =>
  rule
    ? {
        metric: rule.metric,
        operator: rule.operator,
        threshold: String(rule.threshold),
        scope: rule.scope,
        severity: rule.severity,
        cooldownMinutes: String(rule.cooldownMinutes),
      }
    : {
        metric: "temp",
        operator: ">",
        threshold: "",
        scope: "current",
        severity: "warning",
        cooldownMinutes: "60",
      };

export interface AlertRuleFormProps {
  locationId: number;
  rule: AlertRule | null;
  onDone: () => void;
  onCancel?: () => void;
}

export function AlertRuleForm({
  locationId,
  rule,
  onDone,
  onCancel,
}: AlertRuleFormProps) {
  const t = useTranslations("alerts.form");
  const tMetric = useTranslations("notifications.metrics");
  const tScope = useTranslations("notifications.scopes");
  const tSeverity = useTranslations("notifications.severities");
  const tCommon = useTranslations("common");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const queryClient = useQueryClient();
  const schema = useMemo(() => ruleSchema(tv), [tv]);
  const [formError, setFormError] = useState("");

  const preferences = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: getPreferences,
    staleTime: PREFERENCES_STALE_TIME,
  });

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RuleValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(rule),
  });

  const metric = useWatch({ control, name: "metric" });
  const severity = useWatch({ control, name: "severity" });
  const muted = isMuted(severity, preferences.data?.minSeverity);

  const mutation = useMutation({
    mutationFn: (values: RuleValues) => {
      const body = {
        location_id: locationId,
        metric: values.metric,
        operator: values.operator,
        threshold: Number(values.threshold),
        scope: values.scope,
        severity: values.severity,
        cooldown_minutes: Number(values.cooldownMinutes),
      };

      return rule ? updateRule(rule.id, body) : createRule(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ALERT_RULES_QUERY_KEY });
      onDone();
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");

    try {
      await mutation.mutateAsync(values);
    } catch (err) {
      setFormError(applyApiError(err, setError, FIELDS, tError("generic")));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label={t("metric")}
          options={METRICS.map((value) => ({
            value,
            label: tMetric(value),
          }))}
          error={errors.metric?.message}
          {...register("metric")}
        />

        <Select
          label={t("operator")}
          options={OPERATORS.map((value) => ({ value, label: value }))}
          error={errors.operator?.message}
          {...register("operator")}
        />
      </div>

      <TextField
        label={t("threshold")}
        type="number"
        step="any"
        inputMode="decimal"
        placeholder={t("thresholdPlaceholder")}
        hint={t("thresholdHint", { unit: unitLabel(DEFAULT_UNIT[metric]) })}
        error={errors.threshold?.message}
        {...register("threshold")}
      />

      <Select
        label={t("scope")}
        options={SCOPES.map((value) => ({ value, label: tScope(value) }))}
        hint={t("scopeHint")}
        error={errors.scope?.message}
        {...register("scope")}
      />

      <details className="rounded-md border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">
          {t("advanced")}
        </summary>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Select
            label={t("severity")}
            options={SEVERITIES.map((value) => ({
              value,
              label: tSeverity(value),
            }))}
            error={errors.severity?.message}
            {...register("severity")}
          />

          <TextField
            label={t("cooldown")}
            type="number"
            min={0}
            inputMode="numeric"
            hint={t("cooldownHint")}
            error={errors.cooldownMinutes?.message}
            {...register("cooldownMinutes")}
          />
        </div>
      </details>

      {muted && <Callout tone="info">{t("mutedBySeverity")}</Callout>}

      {formError && <Callout tone="error">{formError}</Callout>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {rule ? tCommon("save") : t("add")}
        </Button>
      </div>
    </form>
  );
}
