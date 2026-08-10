"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  requestPasswordReset,
  resetPassword,
  verifyResetOtp,
} from "@/features/auth/api";
import {
  forgotPasswordSchema,
  otpSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type OtpValues,
  type ResetPasswordValues,
} from "@/features/auth/schemas";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TextField } from "@/components/ui/TextField";

// The reset token lives here in React state only. It is a 15-minute credential:
// putting it in localStorage or the URL would leak it to anything that can read
// either.
type Step =
  | { name: "request" }
  | { name: "verify"; email: string }
  | { name: "reset"; resetToken: string };

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>({ name: "request" });

  if (step.name === "verify") {
    return (
      <VerifyStep
        email={step.email}
        onBack={() => setStep({ name: "request" })}
        onVerified={(resetToken) => setStep({ name: "reset", resetToken })}
      />
    );
  }

  if (step.name === "reset") {
    return <ResetStep resetToken={step.resetToken} />;
  }

  return <RequestStep onSent={(email) => setStep({ name: "verify", email })} />;
}

const card = "flex flex-col gap-4 rounded-lg border border-border p-6";

function RequestStep({ onSent }: { onSent: (email: string) => void }) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");
  const [formError, setFormError] = useState("");

  const schema = useMemo(() => forgotPasswordSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    // The API answers 202 whether or not the address exists, so the next step
    // is shown either way - anything else would confirm who has an account.
    mutationFn: (values: ForgotPasswordValues) =>
      requestPasswordReset(values.email).then(() => values.email),
    onSuccess: onSent,
    onError: (error) =>
      setFormError(
        applyApiError(error, setError, ["email"], tError("generic")),
      ),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setFormError("");
        mutation.mutate(values);
      })}
      noValidate
      className={card}
    >
      <h2 className="text-lg font-semibold">{t("forgot.request.title")}</h2>
      <p className="text-sm opacity-70">{t("forgot.request.description")}</p>

      <Callout tone="error">{formError}</Callout>

      <TextField
        label={t("fields.email")}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <Button type="submit" loading={mutation.isPending}>
        {t("forgot.request.submit")}
      </Button>

      <Link href="/login" className="text-sm underline-offset-4 hover:underline">
        {t("forgot.request.backToSignIn")}
      </Link>
    </form>
  );
}

function VerifyStep({
  email,
  onBack,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onVerified: (resetToken: string) => void;
}) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");
  const [formError, setFormError] = useState("");

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

  const mutation = useMutation({
    mutationFn: (values: OtpValues) => verifyResetOtp(email, values.code),
    onSuccess: (response) => onVerified(response.resetToken),
    onError: (error) =>
      setFormError(applyApiError(error, setError, ["code"], tError("generic"))),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setFormError("");
        mutation.mutate(values);
      })}
      noValidate
      className={card}
    >
      <h2 className="text-lg font-semibold">{t("forgot.verify.title")}</h2>
      <p className="text-sm opacity-70">
        {t.rich("forgot.verify.description", {
          email,
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>

      <Callout tone="error">{formError}</Callout>

      <TextField
        label={t("fields.code")}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        error={errors.code?.message}
        {...register("code")}
      />

      <Button type="submit" loading={mutation.isPending}>
        {t("forgot.verify.submit")}
      </Button>

      <Button type="button" variant="ghost" onClick={onBack}>
        {t("forgot.verify.useDifferentEmail")}
      </Button>
    </form>
  );
}

function ResetStep({ resetToken }: { resetToken: string }) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");
  const router = useRouter();
  const [formError, setFormError] = useState("");

  const schema = useMemo(() => resetPasswordSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      resetPassword(resetToken, values.password),
    onSuccess: () => router.replace("/login?reset=1"),
    onError: (error) =>
      setFormError(
        applyApiError(error, setError, ["password"], tError("generic")),
      ),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setFormError("");
        mutation.mutate(values);
      })}
      noValidate
      className={card}
    >
      <h2 className="text-lg font-semibold">{t("forgot.reset.title")}</h2>

      <Callout tone="error">{formError}</Callout>

      <TextField
        label={t("fields.newPassword")}
        type="password"
        autoComplete="new-password"
        hint={t("fields.passwordHint")}
        error={errors.password?.message}
        {...register("password")}
      />

      <TextField
        label={t("fields.confirmNewPassword")}
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" loading={mutation.isPending}>
        {t("forgot.reset.submit")}
      </Button>
    </form>
  );
}
