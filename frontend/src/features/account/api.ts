import { apiRequest } from "@/lib/api/client";
import type { AuthResponse, User } from "@/lib/auth/types";

export const PREFERENCES_QUERY_KEY = ["users", "me", "preferences"] as const;

export type Language = "en" | "vi";
export type Severity = "info" | "warning" | "critical";

export interface Preferences {
  language: Language;
  timezone: string | null;
  emailAlertsEnabled: boolean;
  pushAlertsEnabled: boolean;
  minSeverity: Severity;
}

export interface ProfilePatch {
  username: string | null;
}

export const updateProfile = (patch: ProfilePatch) =>
  apiRequest<{ user: User }>("/users/me", {
    method: "PATCH",
    body: patch,
  }).then((res) => res.user);

export const getPreferences = () =>
  apiRequest<{ preferences: Preferences }>("/users/me/preferences").then(
    (res) => res.preferences,
  );

export const updatePreferences = (patch: Partial<Preferences>) =>
  apiRequest<{ preferences: Preferences }>("/users/me/preferences", {
    method: "PUT",
    body: patch,
  }).then((res) => res.preferences);

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
export const changePassword = (input: ChangePasswordInput) =>
  apiRequest<AuthResponse>("/auth/password/change", {
    method: "POST",
    body: input,
  });
