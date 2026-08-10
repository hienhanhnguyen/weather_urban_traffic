"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
  const { adopt } = useSession();
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
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
      setFormError(applyApiError(err, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />

      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />

      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Callout tone="info">
        Changing your password signs you out everywhere else. This device stays
        signed in.
      </Callout>

      {formError && <Callout tone="error">{formError}</Callout>}

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          Change password
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
