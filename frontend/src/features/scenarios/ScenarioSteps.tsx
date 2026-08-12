import { useTranslations } from "next-intl";
import type { ScenarioStep } from "./api";
import { PriorityBadge } from "./ScenarioBadges";

export function ScenarioSteps({ steps }: { steps: ScenarioStep[] }) {
  const t = useTranslations("govScenarios");

  if (steps.length === 0) {
    return <p className="text-sm opacity-70">{t("noSteps")}</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step) => (
        <li key={step.id} className="flex gap-3">
          <span
            aria-hidden="true"
            className={
              "flex size-7 shrink-0 items-center justify-center rounded-full " +
              "border border-border text-xs font-semibold tabular-nums"
            }
          >
            {step.position}
          </span>

          <div className="flex flex-col gap-1">
            <p className="text-sm">{step.content}</p>
            <PriorityBadge priority={step.priority} />
          </div>
        </li>
      ))}
    </ol>
  );
}
