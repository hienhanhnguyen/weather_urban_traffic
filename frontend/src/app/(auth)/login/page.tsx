"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { signIn } from "@/features/auth/api";
import { signInSchema, type SignInValues } from "@/features/auth/schemas";
import { useSession } from "@/lib/auth/session";
import { applyApiError } from "@/lib/forms/api-errors";
import { safeNext } from "@/lib/navigation/safe-next";
import { landingPath } from "@/features/shell/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TextField } from "@/components/ui/TextField";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const { adopt } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState("");

  // Rebuilt when the locale changes, because zod bakes messages in at build.
  const schema = useMemo(() => signInSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: (response) => {
      adopt(response);
      router.replace(
        safeNext(searchParams.get("next"), landingPath(response.user)),
      );
    },
    onError: (error) => {
      setFormError(
        applyApiError(error, setError, ["email", "password"], tError("generic")),
      );
    },
  });

  const onSubmit = (values: SignInValues) => {
    setFormError("");
    mutation.mutate(values);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-border p-6"
    >
      <h2 className="text-lg font-semibold">{t("signIn.title")}</h2>

      <Callout tone="error">{formError}</Callout>

      <TextField
        label={t("fields.email")}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <TextField
        label={t("fields.password")}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" loading={mutation.isPending}>
        {t("signIn.submit")}
      </Button>

      <div className="flex justify-between text-sm">
        <Link
          href="/forgot-password"
          className="underline-offset-4 hover:underline"
        >
          {t("signIn.forgotPassword")}
        </Link>
        <Link href="/signup" className="underline-offset-4 hover:underline">
          {t("signIn.createAccount")}
        </Link>
      </div>
    </form>
  );
}
