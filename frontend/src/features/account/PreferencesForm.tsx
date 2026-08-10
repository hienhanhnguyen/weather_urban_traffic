"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { Toggle } from "@/components/ui/Toggle";
import { getPreferences, updatePreferences, type Preferences } from "./api";
import { preferencesSchema, type PreferencesValues } from "./schemas";

export const PREFERENCES_QUERY_KEY = ["users", "me", "preferences"] as const;

const FIELDS = [
  "language",
  "timezone",
  "emailAlertsEnabled",
  "pushAlertsEnabled",
  "minSeverity",
] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
] as const;

const SEVERITIES = [
  { value: "info", label: "Info — everything" },
  { value: "warning", label: "Warning and above" },
  { value: "critical", label: "Critical only" },
] as const;

function PreferencesFields({ preferences }: { preferences: Preferences }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PreferencesValues>({
    resolver: zodResolver(preferencesSchema),
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
      setFormError(applyApiError(err, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Select
        label="Language"
        options={LANGUAGES}
        error={errors.language?.message}
        {...register("language")}
      />

      <TextField
        label="Timezone"
        placeholder="Asia/Ho_Chi_Minh"
        error={errors.timezone?.message}
        hint="An IANA timezone name. Used for the timestamps on your alerts."
        {...register("timezone")}
      />

      <Select
        label="Minimum alert severity"
        options={SEVERITIES}
        error={errors.minSeverity?.message}
        hint="Alerts below this level are not delivered to you at all."
        {...register("minSeverity")}
      />

      <Toggle
        label="Email alerts"
        hint="Send matching alerts to your email address."
        {...register("emailAlertsEnabled")}
      />

      <Toggle
        label="Push alerts"
        hint="Send matching alerts to your subscribed browsers."
        {...register("pushAlertsEnabled")}
      />

      {formError && <Callout tone="error">{formError}</Callout>}
      {saved && <Callout tone="success">Preferences saved.</Callout>}

      <div>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save preferences
        </Button>
      </div>
    </form>
  );
}

export function PreferencesForm() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: getPreferences,
  });

  if (isPending) {
    return <p className="text-sm opacity-70">Loading preferences…</p>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="error">
          {error instanceof Error
            ? error.message
            : "Could not load your preferences."}
        </Callout>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return <PreferencesFields preferences={data} />;
}
