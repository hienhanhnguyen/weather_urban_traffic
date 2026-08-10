"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendEmailVerification, verifyEmail } from "@/features/auth/api";
import { otpSchema, type OtpValues } from "@/features/auth/schemas";
import { SESSION_QUERY_KEY, useSession } from "@/lib/auth/session";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TextField } from "@/components/ui/TextField";

export default function VerifyEmailPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const send = useMutation({
    mutationFn: sendEmailVerification,
    onSuccess: (response) => {
      setFormError("");
      setNotice(response.message);
    },
    onError: (error) => {
      setNotice("");
      setFormError(applyApiError(error, setError, []));
    },
  });

  const verify = useMutation({
    mutationFn: (values: OtpValues) => verifyEmail(values.code),
    onSuccess: (response) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, response.user);
      router.replace("/home");
    },
    onError: (error) => {
      setNotice("");
      setFormError(applyApiError(error, setError, ["code"]));
    },
  });

  // Already verified or verified in another tab
  useEffect(() => {
    if (user?.emailVerified) router.replace("/home");
  }, [user?.emailVerified, router]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Verify your email
        </h1>
        <p className="mt-1 text-sm opacity-70">
          We need to confirm <strong>{user?.email}</strong> before sending you
          alerts.
        </p>
      </div>

      <Callout tone="error">{formError}</Callout>
      <Callout tone="success">{notice}</Callout>

      <Button
        type="button"
        variant="secondary"
        loading={send.isPending}
        onClick={() => send.mutate()}
      >
        {send.isSuccess ? "Send another code" : "Send verification code"}
      </Button>

      <form
        onSubmit={handleSubmit((values) => {
          setFormError("");
          verify.mutate(values);
        })}
        noValidate
        className="flex flex-col gap-4 rounded-lg border border-black/10 p-6 dark:border-white/15"
      >
        <TextField
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.code?.message}
          {...register("code")}
        />

        <Button type="submit" loading={verify.isPending}>
          Verify email
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        onClick={() => router.push("/home")}
      >
        Skip for now
      </Button>
    </div>
  );
}
