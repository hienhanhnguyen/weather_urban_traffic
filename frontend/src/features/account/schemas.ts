import { z } from "zod";
import type { TranslateValidation } from "@/lib/forms/translate";

export const profileSchema = (t: TranslateValidation) =>
  z.object({
    // Blank means "remove my username", which the API models as null.
    username: z
      .string()
      .regex(/^[a-zA-Z0-9]*$/, t("usernameAlnum"))
      .max(64, t("usernameMax"))
      .refine((v) => v === "" || v.length >= 3, t("usernameMin")),
  });

export const preferencesSchema = (t: TranslateValidation) =>
  z.object({
    language: z.enum(["en", "vi"]),
    timezone: z.string().max(64, t("timezoneMax")),
    emailAlertsEnabled: z.boolean(),
    pushAlertsEnabled: z.boolean(),
    minSeverity: z.enum(["info", "warning", "critical"]),
  });

export const changePasswordSchema = (t: TranslateValidation) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(1, t("currentPasswordRequired"))
        .max(72),
      newPassword: z
        .string()
        .min(8, t("passwordMin"))
        .max(72, t("passwordMax")),
      confirmPassword: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordsNoMatch"),
    })
    .refine((values) => values.newPassword !== values.currentPassword, {
      path: ["newPassword"],
      message: t("newPasswordReused"),
    });

export type ProfileValues = z.infer<ReturnType<typeof profileSchema>>;
export type PreferencesValues = z.infer<ReturnType<typeof preferencesSchema>>;
export type ChangePasswordValues = z.infer<
  ReturnType<typeof changePasswordSchema>
>;
