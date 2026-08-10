"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LOCALES } from "@/i18n/config";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { Toggle } from "@/components/ui/Toggle";
import {
  PREFERENCES_QUERY_KEY,
  getPreferences,
  updatePreferences,
  type Preferences,
} from "./api";
import { preferencesSchema, type PreferencesValues } from "./schemas";

const FIELDS = [
  "language",
  "timezone",
  "emailAlertsEnabled",
  "pushAlertsEnabled",
  "minSeverity",
] as const;

const SEVERITIES = ["info", "warning", "critical"] as const;

function PreferencesFields({ preferences }: { preferences: Preferences }) {
  const t = useTranslations("account.preferences");
  const tSeverity = useTranslations("account.severity");
  const tLocale = useTranslations("locale");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  const schema = useMemo(() => preferencesSchema(tv), [tv]);

  const languages = useMemo(
    () => LOCALES.map((value) => ({ value, label: tLocale(value) })),
    [tLocale],
  );

  const severities = useMemo(
    () => SEVERITIES.map((value) => ({ value, label: tSeverity(value) })),
    [tSeverity],
  );

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PreferencesValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...preferences, timezone: preferences.timezone ?? "" },
  });

  const mutation = useMutation({ mutationFn: updatePreferences });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    setSaved(false);

    try {
      const updated = await mutation.mutateAsync({
        ...values,
        timezone: values.timezone === "" ? null : values.timezone,
      });

      queryClient.setQueryData(PREFERENCES_QUERY_KEY, updated);
      reset({ ...updated, timezone: updated.timezone ?? "" });
      setSaved(true);
    } catch (err) {
      setFormError(applyApiError(err, setError, FIELDS, tError("generic")));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Select
        label={tLocale("label")}
        options={languages}
        error={errors.language?.message}
        {...register("language")}
      />

      <TextField
        label={t("timezone")}
        placeholder="Asia/Ho_Chi_Minh"
        error={errors.timezone?.message}
        hint={t("timezoneHint")}
        {...register("timezone")}
      />

      <Select
        label={t("minSeverity")}
        options={severities}
        error={errors.minSeverity?.message}
        hint={t("minSeverityHint")}
        {...register("minSeverity")}
      />

      <Toggle
        label={t("emailAlerts")}
        hint={t("emailAlertsHint")}
        {...register("emailAlertsEnabled")}
      />

      <Toggle
        label={t("pushAlerts")}
        hint={t("pushAlertsHint")}
        {...register("pushAlertsEnabled")}
      />

      {formError && <Callout tone="error">{formError}</Callout>}
      {saved && <Callout tone="success">{t("saved")}</Callout>}

      <div>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}

export function PreferencesForm() {
  const t = useTranslations("account.preferences");
  const tCommon = useTranslations("common");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: getPreferences,
  });

  if (isPending) {
    return <p className="text-sm opacity-70">{t("loading")}</p>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="error">
          {error instanceof Error ? error.message : t("loadError")}
        </Callout>
        <Button variant="secondary" onClick={() => refetch()}>
          {tCommon("tryAgain")}
        </Button>
      </div>
    );
  }

  return <PreferencesFields preferences={data} />;
}
