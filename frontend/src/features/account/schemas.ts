import { z } from "zod";

export const profileSchema = z.object({
  username: z
    .string()
    .regex(/^[a-zA-Z0-9]*$/, "Letters and numbers only")
    .max(64, "Use at most 64 characters")
    .refine((v) => v === "" || v.length >= 3, "Use at least 3 characters"),
});

export const preferencesSchema = z.object({
  language: z.enum(["en", "vi"]),
  timezone: z.string().max(64, "Use at most 64 characters"),
  emailAlertsEnabled: z.boolean(),
  pushAlertsEnabled: z.boolean(),
  minSeverity: z.enum(["info", "warning", "critical"]),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(72),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Use at most 72 characters"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password you have not used here before",
  });

export type ProfileValues = z.infer<typeof profileSchema>;
export type PreferencesValues = z.infer<typeof preferencesSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
