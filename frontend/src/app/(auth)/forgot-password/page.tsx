"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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

const card =
  "flex flex-col gap-4 rounded-lg border border-black/10 p-6 dark:border-white/15";

function RequestStep({ onSent }: { onSent: (email: string) => void }) {
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordValues) =>
      requestPasswordReset(values.email).then(() => values.email),
    onSuccess: onSent,
    onError: (error) => setFormError(applyApiError(error, setError, ["email"])),
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
      <h2 className="text-lg font-semibold">Reset your password</h2>
      <p className="text-sm opacity-70">
        Enter your email and we will send you a 6-digit code.
      </p>

      <Callout tone="error">{formError}</Callout>

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <Button type="submit" loading={mutation.isPending}>
        Send code
      </Button>

      <Link
        href="/login"
        className="text-sm underline-offset-4 hover:underline"
      >
        Back to sign in
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
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: OtpValues) => verifyResetOtp(email, values.code),
    onSuccess: (response) => onVerified(response.resetToken),
    onError: (error) => setFormError(applyApiError(error, setError, ["code"])),
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
      <h2 className="text-lg font-semibold">Enter your code</h2>
      <p className="text-sm opacity-70">
        If an account exists for <strong>{email}</strong>, a code is on its way.
        It expires in a few minutes.
      </p>

      <Callout tone="error">{formError}</Callout>

      <TextField
        label="6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        error={errors.code?.message}
        {...register("code")}
      />

      <Button type="submit" loading={mutation.isPending}>
        Verify code
      </Button>

      <Button type="button" variant="ghost" onClick={onBack}>
        Use a different email
      </Button>
    </form>
  );
}

function ResetStep({ resetToken }: { resetToken: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      resetPassword(resetToken, values.password),
    onSuccess: () => router.replace("/login?reset=1"),
    onError: (error) =>
      setFormError(applyApiError(error, setError, ["password"])),
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
      <h2 className="text-lg font-semibold">Choose a new password</h2>

      <Callout tone="error">{formError}</Callout>

      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password?.message}
        {...register("password")}
      />

      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" loading={mutation.isPending}>
        Update password
      </Button>
    </form>
  );
}
