import type { AlertSeverity } from "@/features/notifications/api";
import type {
  AreaAlertRule,
  AreaAlertRuleInput,
  AreaMetric,
} from "./alerts-api";

export const AREA_METRICS: readonly AreaMetric[] = [
  "temp",
  "feelslike",
  "precip",
  "precipprob",
];

export interface MetricRange {
  min: number;
  max: number;
  step: number;
}

export const METRIC_RANGE: Record<AreaMetric, MetricRange> = {
  temp: { min: -30, max: 60, step: 1 },
  feelslike: { min: -30, max: 60, step: 1 },
  precip: { min: 0, max: 500, step: 5 },
  precipprob: { min: 0, max: 100, step: 5 },
};

export const METRIC_DEFAULT: Record<AreaMetric, number> = {
  temp: 36,
  feelslike: 38,
  precip: 50,
  precipprob: 70,
};

export const METRIC_UNIT: Record<AreaMetric, string> = {
  temp: "°C",
  feelslike: "°C",
  precip: "mm",
  precipprob: "%",
};

export const COOLDOWN_CHOICES: readonly number[] = [15, 30, 60, 180, 720, 1440];

export const DEFAULT_COOLDOWN_MINUTES = 60;

export interface MetricSetting {
  enabled: boolean;
  threshold: number;
  severity: AlertSeverity;
}

export interface AreaAlertForm {
  cooldownMinutes: number;
  metrics: Record<AreaMetric, MetricSetting>;
}

const setting = (metric: AreaMetric): MetricSetting => ({
  enabled: false,
  threshold: METRIC_DEFAULT[metric],
  severity: "warning",
});

export const emptyAlertForm = (): AreaAlertForm => ({
  cooldownMinutes: DEFAULT_COOLDOWN_MINUTES,
  metrics: {
    temp: setting("temp"),
    feelslike: setting("feelslike"),
    precip: setting("precip"),
    precipprob: setting("precipprob"),
  },
});

export const clampThreshold = (metric: AreaMetric, value: number) => {
  const { min, max } = METRIC_RANGE[metric];

  if (!Number.isFinite(value)) return METRIC_DEFAULT[metric];

  return Math.min(Math.max(value, min), max);
};

export function alertForm(rules: AreaAlertRule[]): AreaAlertForm {
  const form = emptyAlertForm();

  if (rules.length > 0) form.cooldownMinutes = rules[0].cooldownMinutes;

  for (const rule of rules) {
    form.metrics[rule.metric] = {
      enabled: rule.isEnabled,
      threshold: clampThreshold(rule.metric, rule.threshold),
      severity: rule.severity,
    };
  }

  return form;
}

export function alertRulesPayload(form: AreaAlertForm): AreaAlertRuleInput[] {
  return AREA_METRICS.filter((metric) => form.metrics[metric].enabled).map(
    (metric) => ({
      metric,
      threshold: clampThreshold(metric, form.metrics[metric].threshold),
      severity: form.metrics[metric].severity,
      cooldown_minutes: form.cooldownMinutes,
      is_enabled: true,
    }),
  );
}

export const cooldownParts = (minutes: number) =>
  minutes >= 60 && minutes % 60 === 0
    ? { unit: "hours" as const, value: minutes / 60 }
    : { unit: "minutes" as const, value: minutes };

export const watchedCount = (form: AreaAlertForm) =>
  AREA_METRICS.filter((metric) => form.metrics[metric].enabled).length;
