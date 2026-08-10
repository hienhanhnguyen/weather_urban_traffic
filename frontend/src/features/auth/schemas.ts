import { z } from "zod";
import type { TranslateValidation } from "@/lib/forms/translate";

const emailField = (t: TranslateValidation) =>
  z
    .string()
    .min(1, t("emailRequired"))
    .max(255, t("emailTooLong"))
    .email(t("emailInvalid"));

const passwordField = (t: TranslateValidation) =>
  z.string().min(8, t("passwordMin")).max(72, t("passwordMax"));

const otpField = (t: TranslateValidation) =>
  z
    .string()
    .length(6, t("codeLength"))
    .regex(/^\d+$/, t("codeDigits"));

export const signInSchema = (t: TranslateValidation) =>
  z.object({
    email: emailField(t),
    password: z.string().min(1, t("passwordRequired")).max(72),
  });

export const signUpSchema = (t: TranslateValidation) =>
  z
    .object({
      email: emailField(t),
      username: z
        .string()
        .regex(/^[a-zA-Z0-9]*$/, t("usernameAlnum"))
        .max(64, t("usernameMax"))
        .refine((v) => v === "" || v.length >= 3, t("usernameMin")),
      password: passwordField(t),
      confirmPassword: z.string(),
      accountType: z.enum(["individual", "business"]),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordsNoMatch"),
    });

export const forgotPasswordSchema = (t: TranslateValidation) =>
  z.object({ email: emailField(t) });

export const otpSchema = (t: TranslateValidation) =>
  z.object({ code: otpField(t) });

export const resetPasswordSchema = (t: TranslateValidation) =>
  z
    .object({ password: passwordField(t), confirmPassword: z.string() })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordsNoMatch"),
    });

export type SignInValues = z.infer<ReturnType<typeof signInSchema>>;
export type SignUpValues = z.infer<ReturnType<typeof signUpSchema>>;
export type ForgotPasswordValues = z.infer<
  ReturnType<typeof forgotPasswordSchema>
>;
export type OtpValues = z.infer<ReturnType<typeof otpSchema>>;
export type ResetPasswordValues = z.infer<
  ReturnType<typeof resetPasswordSchema>
>;
