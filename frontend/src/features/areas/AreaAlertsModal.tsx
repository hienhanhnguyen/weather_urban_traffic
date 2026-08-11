"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import {
  ALERT_EVENTS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
  type AlertSeverity,
} from "@/features/notifications/api";
import { SEVERITIES } from "@/features/alerts/format";
import { usePush } from "@/features/push/usePush";
import type { ManagedArea } from "./api";
import {
  areaAlertsQueryKey,
  evaluateAreaRules,
  listAreaRules,
  replaceAreaRules,
  type AreaMetric,
} from "./alerts-api";
import {
  AREA_METRICS,
  COOLDOWN_CHOICES,
  cooldownParts,
  METRIC_RANGE,
  METRIC_UNIT,
  alertForm,
  alertRulesPayload,
  clampThreshold,
  emptyAlertForm,
  watchedCount,
  type AreaAlertForm,
} from "./alerts";

export function AreaAlertsModal({
  area,
  onClose,
}: {
  area: ManagedArea;
  onClose: () => void;
}) {
  const t = useTranslations("areaAlerts");
  const tMetrics = useTranslations("areaAlerts.metrics");
  const tReasons = useTranslations("areaAlerts.reasons");
  const tSeverity = useTranslations("notifications.severities");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const push = usePush();

  const [form, setForm] = useState<AreaAlertForm | null>(null);

  const query = useQuery({
    queryKey: areaAlertsQueryKey(area.id),
    queryFn: () => listAreaRules(area.id),
  });

  const current = form ?? (query.data ? alertForm(query.data) : null);

  const edit = (change: (draft: AreaAlertForm) => AreaAlertForm) =>
    setForm((previous) =>
      change(
        previous ?? (query.data ? alertForm(query.data) : emptyAlertForm()),
      ),
    );

  const setMetric = (
    metric: AreaMetric,
    patch: Partial<AreaAlertForm["metrics"][AreaMetric]>,
  ) =>
    edit((draft) => ({
      ...draft,
      metrics: {
        ...draft.metrics,
        [metric]: { ...draft.metrics[metric], ...patch },
      },
    }));

  const save = useMutation({
    mutationFn: () => replaceAreaRules(area.id, alertRulesPayload(current!)),
    onSuccess: (rules) => {
      queryClient.setQueryData(areaAlertsQueryKey(area.id), rules);
      setForm(null);
      onClose();
    },
  });

  const run = useMutation({
    mutationFn: (force: boolean) => evaluateAreaRules(area.id, force),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: areaAlertsQueryKey(area.id),
      });

      if (result.fired.length > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ALERT_EVENTS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY }),
        ]);
      }
    },
  });

  const pushOff =
    push.local.data?.supported === true && push.local.data.endpoint === null;

  return (
    <Modal open size="lg" title={t("title")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm opacity-70">
            {t("subtitle", { name: area.name })}
          </p>

          {current && (
            <p className="text-sm opacity-70">
              {t("watching", { count: watchedCount(current) })}
            </p>
          )}
        </div>

        {query.isPending && (
          <p className="text-sm opacity-70">{tCommon("loading")}</p>
        )}

        {query.isError && <Callout tone="error">{t("loadFailed")}</Callout>}

        {current && (
          <>
            <ul className="flex flex-col gap-3">
              {AREA_METRICS.map((metric) => {
                const setting = current.metrics[metric];
                const range = METRIC_RANGE[metric];

                return (
                  <li
                    key={metric}
                    className="flex flex-col gap-3 rounded-lg border border-border p-4"
                  >
                    <Toggle
                      label={tMetrics(metric)}
                      hint={t(`hints.${metric}`)}
                      checked={setting.enabled}
                      onChange={(event) =>
                        setMetric(metric, { enabled: event.target.checked })
                      }
                    />

                    {setting.enabled && (
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
                          <label
                            htmlFor={`threshold-${metric}`}
                            className="flex justify-between text-sm font-medium"
                          >
                            <span>{t("threshold")}</span>
                            <span className="tabular-nums">
                              {format.number(setting.threshold)}{" "}
                              {METRIC_UNIT[metric]}
                            </span>
                          </label>

                          <input
                            id={`threshold-${metric}`}
                            type="range"
                            min={range.min}
                            max={range.max}
                            step={range.step}
                            value={setting.threshold}
                            onChange={(event) =>
                              setMetric(metric, {
                                threshold: clampThreshold(
                                  metric,
                                  Number(event.target.value),
                                ),
                              })
                            }
                            className="accent-sky-600"
                          />

                          <p className="flex justify-between text-xs opacity-60">
                            <span>
                              {range.min} {METRIC_UNIT[metric]}
                            </span>
                            <span>
                              {range.max} {METRIC_UNIT[metric]}
                            </span>
                          </p>
                        </div>

                        <Select
                          label={t("severity")}
                          value={setting.severity}
                          onChange={(event) =>
                            setMetric(metric, {
                              severity: event.target.value as AlertSeverity,
                            })
                          }
                          options={SEVERITIES.map((value) => ({
                            value,
                            label: tSeverity(value),
                          }))}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <Select
              label={t("cooldown")}
              hint={t("cooldownHint")}
              value={String(current.cooldownMinutes)}
              onChange={(event) =>
                edit((draft) => ({
                  ...draft,
                  cooldownMinutes: Number(event.target.value),
                }))
              }
              options={COOLDOWN_CHOICES.map((minutes) => {
                const parts = cooldownParts(minutes);

                return {
                  value: String(minutes),
                  label:
                    parts.unit === "hours"
                      ? t("cooldownHours", { value: parts.value })
                      : t("cooldownMinutes", { value: parts.value }),
                };
              })}
            />

            <section className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t("run.title")}</p>
                  <p className="text-sm opacity-70">{t("run.hint")}</p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  loading={run.isPending}
                  onClick={() => run.mutate(true)}
                >
                  <Send aria-hidden="true" className="size-4" />
                  {t("run.action")}
                </Button>
              </div>

              {pushOff && (
                <Callout tone="info">
                  {push.local.data?.permission === "denied"
                    ? t("run.pushBlocked")
                    : t("run.pushOff")}
                </Callout>
              )}

              {run.isError && (
                <Callout tone="error">{tError("generic")}</Callout>
              )}

              {run.isSuccess && (
                <div className="flex flex-col gap-1 text-sm">
                  {run.data.fired.map((hit) => (
                    <p
                      key={hit.metric}
                      className="text-emerald-700 dark:text-emerald-400"
                    >
                      {t("run.fired", {
                        metric: tMetrics(hit.metric),
                        value: format.number(hit.value),
                        threshold: format.number(hit.threshold),
                        unit: METRIC_UNIT[hit.metric],
                      })}
                    </p>
                  ))}

                  {run.data.skipped.map((skip) => (
                    <p key={skip.metric} className="opacity-70">
                      {t("run.skipped", {
                        metric: tMetrics(skip.metric),
                        reason: tReasons(skip.reason),
                      })}
                    </p>
                  ))}

                  {run.data.fired.length === 0 &&
                    run.data.skipped.length === 0 && (
                      <p className="opacity-70">{t("run.nothing")}</p>
                    )}
                </div>
              )}
            </section>

            {save.isError && (
              <Callout tone="error">{tError("generic")}</Callout>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                {tCommon("cancel")}
              </Button>

              <Button
                type="button"
                loading={save.isPending}
                onClick={() => save.mutate()}
              >
                {tCommon("save")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
