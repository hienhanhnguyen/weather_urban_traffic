import { useTranslations } from "next-intl";
import type { ScenarioPriority, ScenarioStatus } from "./api";

const BADGE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

const STATUS_TONE: Record<ScenarioStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  archived: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

const PRIORITY_TONE: Record<ScenarioPriority, string> = {
  high: "bg-red-500/15 text-red-700 dark:text-red-400",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  low: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

export function ScenarioStatusBadge({ status }: { status: ScenarioStatus }) {
  const t = useTranslations("govScenarios.statuses");

  return <span className={`${BADGE} ${STATUS_TONE[status]}`}>{t(status)}</span>;
}

export function PriorityBadge({ priority }: { priority: ScenarioPriority }) {
  const t = useTranslations("govScenarios.priorities");

  return (
    <span className={`${BADGE} ${PRIORITY_TONE[priority]}`}>
      {t(priority)}
    </span>
  );
}
