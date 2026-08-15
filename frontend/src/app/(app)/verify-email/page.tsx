"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { sendEmailVerification, verifyEmail } from "@/features/auth/api";
import { otpSchema, type OtpValues } from "@/features/auth/schemas";
import { SESSION_QUERY_KEY, useSession } from "@/lib/auth/session";
import { applyApiError } from "@/lib/forms/api-errors";
import { landingPath } from "@/features/shell/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TextField } from "@/components/ui/TextField";

export default function VerifyEmailPage() {
  const t = useTranslations("verifyEmail");
  const tAuth = useTranslations("auth");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const { user } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [formError, setFormError] = useState("");
  const [sent, setSent] = useState(false);

  const schema = useMemo(() => otpSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OtpValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" },
  });

  const send = useMutation({
    mutationFn: sendEmailVerification,
    onSuccess: () => {
      // The server's own message is English-only, so the confirmation comes
      // from the catalogue instead.
      setFormError("");
      setSent(true);
    },
    onError: (error) => {
      setSent(false);
      setFormError(applyApiError(error, setError, [], tError("generic")));
    },
  });

  const verify = useMutation({
    mutationFn: (values: OtpValues) => verifyEmail(values.code),
    onSuccess: (response) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, response.user);
      router.replace(landingPath(response.user));
    },
    onError: (error) => {
      setSent(false);
      setFormError(applyApiError(error, setError, ["code"], tError("generic")));
    },
  });

  // Already verified, or verified in another tab.
  useEffect(() => {
    if (user?.emailVerified) router.replace(landingPath(user));
  }, [user, router]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm opacity-70">
          {t.rich("description", {
            email: user?.email ?? "",
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </div>

      <Callout tone="error">{formError}</Callout>
      {sent && <Callout tone="success">{t("codeSent")}</Callout>}

      <Button
        type="button"
        variant="secondary"
        loading={send.isPending}
        onClick={() => send.mutate()}
      >
        {send.isSuccess ? t("sendAnother") : t("sendCode")}
      </Button>

      <form
        onSubmit={handleSubmit((values) => {
          setFormError("");
          verify.mutate(values);
        })}
        noValidate
        className="flex flex-col gap-4 rounded-lg border border-border p-6"
      >
        <TextField
          label={tAuth("fields.code")}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.code?.message}
          {...register("code")}
        />

        <Button type="submit" loading={verify.isPending}>
          {t("submit")}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        onClick={() => router.push(landingPath(user))}
      >
        {t("skip")}
      </Button>
    </div>
  );
}
