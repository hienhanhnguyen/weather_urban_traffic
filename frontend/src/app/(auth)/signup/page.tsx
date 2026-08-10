"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { signUp } from "@/features/auth/api";
import { signUpSchema, type SignUpValues } from "@/features/auth/schemas";
import { useSession } from "@/lib/auth/session";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TextField } from "@/components/ui/TextField";

const ACCOUNT_TYPES = [
  {
    value: "individual",
    title: "Personal",
    blurb: "Saved places, weather alerts and route warnings for your commute.",
  },
  {
    value: "business",
    title: "Business",
    blurb: "Everything personal has, plus risk assessment and reports.",
  },
] as const;

export default function SignupPage() {
  const { adopt } = useSession();
  const router = useRouter();
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      accountType: "individual",
    },
  });

  const selectedType = watch("accountType");

  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: (response) => {
      // Sign up return a token pair: the user is already signed in and sent straight to verification rather than back to the login form
      adopt(response);
      router.replace("/verify-email");
    },
    onError: (error) => {
      setFormError(
        applyApiError(error, setError, [
          "email",
          "username",
          "password",
          "accountType",
        ]),
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
      className="flex flex-col gap-4 rounded-lg border border-black/10 p-6 dark:border-white/15"
    >
      <h2 className="text-lg font-semibold">Create an account</h2>

      <Callout tone="error">{formError}</Callout>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Account type</legend>

        {ACCOUNT_TYPES.map((option) => (
          <label
            key={option.value}
            className={
              "flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors " +
              (selectedType === option.value
                ? "border-sky-600 bg-sky-500/10"
                : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10")
            }
          >
            <input
              type="radio"
              value={option.value}
              className="mt-1"
              {...register("accountType")}
            />
            <span>
              <span className="block font-medium">{option.title}</span>
              <span className="block opacity-70">{option.blurb}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <TextField
        label="Username"
        autoComplete="username"
        hint="Optional. Letters and numbers, 3-64 characters."
        error={errors.username?.message}
        {...register("username")}
      />

      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password?.message}
        {...register("password")}
      />

      <TextField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" loading={mutation.isPending}>
        Create account
      </Button>

      <p className="text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
