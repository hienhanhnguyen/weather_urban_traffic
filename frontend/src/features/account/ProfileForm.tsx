"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { SESSION_QUERY_KEY, useSession } from "@/lib/auth/session";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TextField } from "@/components/ui/TextField";
import { updateProfile } from "./api";
import { profileSchema, type ProfileValues } from "./schemas";

const FIELDS = ["username"] as const;

export function ProfileForm() {
  const t = useTranslations("account.profile");
  const tAuth = useTranslations("auth.fields");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const { user } = useSession();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  const schema = useMemo(() => profileSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: user?.username ?? "" },
  });

  const mutation = useMutation({ mutationFn: updateProfile });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    setSaved(false);

    try {
      const updated = await mutation.mutateAsync({
        username: values.username === "" ? null : values.username,
      });

      queryClient.setQueryData(SESSION_QUERY_KEY, updated);
      reset({ username: updated.username ?? "" });
      setSaved(true);
    } catch (err) {
      setFormError(applyApiError(err, setError, FIELDS, tError("generic")));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label={tAuth("email")}
        value={user?.email ?? ""}
        readOnly
        disabled
        hint={t("emailHint")}
      />

      <TextField
        label={tAuth("username")}
        autoComplete="username"
        error={errors.username?.message}
        hint={t("usernameHint")}
        {...register("username")}
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
