import { useTranslations } from "next-intl";
import type { AlertSeverity } from "./api";

const COLORS: Record<AlertSeverity, string> = {
  info: "bg-sky-500",
  warning: "bg-amber-500",
  critical: "bg-red-600",
};

export function SeverityDot({
  severity,
  className = "",
}: {
  severity: AlertSeverity;
  className?: string;
}) {
  const t = useTranslations("notifications.severities");

  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${COLORS[severity]}`}
      />
      <span className="sr-only">{t(severity)}</span>
    </span>
  );
}
