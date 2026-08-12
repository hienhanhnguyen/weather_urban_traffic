import { useTranslations } from "next-intl";
import type { AreaRisk } from "./heatmap-api";
import { RISKS, RISK_COLOR } from "./heatmap";

const TONE: Record<AreaRisk, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  clear: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  unknown: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  none: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

export function RiskBadge({ risk }: { risk: AreaRisk }) {
  const t = useTranslations("govHeatmap.risks");

  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 " +
        `text-xs font-medium ${TONE[risk]}`
      }
    >
      {t(risk)}
    </span>
  );
}

export function RiskLegend() {
  const t = useTranslations("govHeatmap.risks");

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-80">
      {RISKS.map((risk) => (
        <li key={risk} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ backgroundColor: RISK_COLOR[risk] }}
          />
          {t(risk)}
        </li>
      ))}
    </ul>
  );
}
