"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SESSION_QUERY_KEY, useSession } from "@/lib/auth/session";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TextField } from "@/components/ui/TextField";
import { updateProfile } from "./api";
import { profileSchema, type ProfileValues } from "./schemas";

const FIELDS = ["username"] as const;

export function ProfileForm() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
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
      setFormError(applyApiError(err, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label="Email"
        value={user?.email ?? ""}
        readOnly
        disabled
        hint="Your email address cannot be changed here."
      />

      <TextField
        label="Username"
        autoComplete="username"
        error={errors.username?.message}
        hint="Letters and numbers only. Leave blank to remove it."
        {...register("username")}
      />

      {formError && <Callout tone="error">{formError}</Callout>}
      {saved && <Callout tone="success">Profile updated.</Callout>}

      <div>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
