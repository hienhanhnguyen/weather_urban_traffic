"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth/session";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TextField } from "@/components/ui/TextField";
import { changePassword } from "./api";
import { changePasswordSchema, type ChangePasswordValues } from "./schemas";

const FIELDS = ["currentPassword", "newPassword"] as const;

interface ChangePasswordFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ChangePasswordForm({
  onSuccess,
  onCancel,
}: ChangePasswordFormProps) {
  const t = useTranslations("account.password");
  const tAuth = useTranslations("auth.fields");
  const tCommon = useTranslations("common");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const { adopt } = useSession();
  const [formError, setFormError] = useState("");

  const schema = useMemo(() => changePasswordSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({ mutationFn: changePassword });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");

    try {
      const response = await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      adopt(response);
      onSuccess();
    } catch (err) {
      setFormError(applyApiError(err, setError, FIELDS, tError("generic")));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label={t("current")}
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />

      <TextField
        label={tAuth("newPassword")}
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />

      <TextField
        label={tAuth("confirmNewPassword")}
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Callout tone="info">{t("warning")}</Callout>

      {formError && <Callout tone="error">{formError}</Callout>}

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {t("submit")}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
