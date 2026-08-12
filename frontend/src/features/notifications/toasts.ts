import type { AlertSeverity } from "./api";
import type { AlertFrame } from "./socket";

export type Urgency = "assertive" | "polite";

export const urgencyFor = (severity: AlertSeverity): Urgency =>
  severity === "critical" ? "assertive" : "polite";

export interface ToastGroups {
  assertive: AlertFrame[];
  polite: AlertFrame[];
}

export function byUrgency(alerts: readonly AlertFrame[]): ToastGroups {
  const groups: ToastGroups = { assertive: [], polite: [] };

  for (const alert of alerts) {
    groups[urgencyFor(alert.severity)].push(alert);
  }

  return groups;
}
