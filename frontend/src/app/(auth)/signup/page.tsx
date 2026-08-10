"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { signUp } from "@/features/auth/api";
import { signUpSchema, type SignUpValues } from "@/features/auth/schemas";
import { useSession } from "@/lib/auth/session";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TextField } from "@/components/ui/TextField";

// `admin_officer` is deliberately absent: government access is granted by an
// admin through PUT /users/:id/roles, never self-assigned at sign-up.
const ACCOUNT_TYPES = ["individual", "business"] as const;

export default function SignupPage() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const { adopt } = useSession();
  const router = useRouter();
  const [formError, setFormError] = useState("");

  const schema = useMemo(() => signUpSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      accountType: "individual",
    },
  });

  const selectedType = useWatch({ control, name: "accountType" });

  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: (response) => {
      // Sign up returns a token pair: the user is already signed in and sent
      // straight to verification rather than back to the login form.
      adopt(response);
      router.replace("/verify-email");
    },
    onError: (error) => {
      setFormError(
        applyApiError(
          error,
          setError,
          ["email", "username", "password", "accountType"],
          tError("generic"),
        ),
      );
    },
  });

  const onSubmit = (values: SignUpValues) => {
    setFormError("");
    mutation.mutate({
      email: values.email,
      password: values.password,
      ...(values.username ? { username: values.username } : {}),
      accountType: values.accountType,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-border p-6"
    >
      <h2 className="text-lg font-semibold">{t("signUp.title")}</h2>

      <Callout tone="error">{formError}</Callout>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          {t("signUp.accountTypeLegend")}
        </legend>

        {ACCOUNT_TYPES.map((value) => (
          <label
            key={value}
            className={
              "flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors " +
              (selectedType === value
                ? "border-sky-600 bg-sky-500/10"
                : "border-border hover:bg-black/5 dark:hover:bg-white/10")
            }
          >
            <input
              type="radio"
              value={value}
              className="mt-1"
              {...register("accountType")}
            />
            <span>
              <span className="block font-medium">
                {t(`signUp.types.${value}.title`)}
              </span>
              <span className="block opacity-70">
                {t(`signUp.types.${value}.blurb`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <TextField
        label={t("fields.email")}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <TextField
        label={t("fields.username")}
        autoComplete="username"
        hint={t("fields.usernameHint")}
        error={errors.username?.message}
        {...register("username")}
      />

      <TextField
        label={t("fields.password")}
        type="password"
        autoComplete="new-password"
        hint={t("fields.passwordHint")}
        error={errors.password?.message}
        {...register("password")}
      />

      <TextField
        label={t("fields.confirmPassword")}
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" loading={mutation.isPending}>
        {t("signUp.submit")}
      </Button>

      <p className="text-sm">
        {t("signUp.haveAccount")}{" "}
        <Link href="/login" className="underline-offset-4 hover:underline">
          {t("signUp.signInLink")}
        </Link>
      </p>
    </form>
  );
}
