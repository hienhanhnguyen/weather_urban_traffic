import { useTranslations } from "next-intl";
import type { AlertSeverity } from "@/features/notifications/api";
import type { IncidentStatus } from "./api";

const BADGE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

const STATUS_TONE: Record<IncidentStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  acknowledged: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

const SEVERITY_TONE: Record<AlertSeverity, string> = {
  info: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const t = useTranslations("govIncidents.statuses");

  return (
    <span className={`${BADGE} ${STATUS_TONE[status]}`}>{t(status)}</span>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const t = useTranslations("notifications.severities");

  return (
    <span className={`${BADGE} ${SEVERITY_TONE[severity]}`}>{t(severity)}</span>
  );
}
