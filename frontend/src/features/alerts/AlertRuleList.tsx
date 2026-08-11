"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { SeverityDot } from "@/features/notifications/SeverityDot";
import {
  ALERT_RULES_QUERY_KEY,
  deleteRule,
  locationRulesQueryKey,
  updateRule,
  type AlertRule,
  type AlertRulePage,
} from "./api";
import { unitLabel } from "./format";

export interface AlertRuleListProps {
  locationId: number;
  rules: AlertRule[];
  onEdit: (rule: AlertRule) => void;
  onError: (message: string) => void;
}

export function AlertRuleList({
  locationId,
  rules,
  onEdit,
  onError,
}: AlertRuleListProps) {
  const t = useTranslations("alerts.rule");
  const tMetric = useTranslations("notifications.metrics");
  const tScope = useTranslations("notifications.scopes");
  const tSeverity = useTranslations("notifications.severities");
  const tError = useTranslations("errors");
  const format = useFormatter();

  const queryClient = useQueryClient();
  const key = locationRulesQueryKey(locationId);

  const applyOptimistic = async (
    edit: (page: AlertRulePage) => AlertRulePage,
  ) => {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<AlertRulePage>(key);
    queryClient.setQueryData<AlertRulePage>(key, (page) =>
      page ? edit(page) : page,
    );
    return { previous };
  };

  const rollback = {
    onError: (
      _error: unknown,
      _input: unknown,
      context?: { previous?: AlertRulePage },
    ) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      onError(tError("generic"));
    },
    onSuccess: () => onError(""),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ALERT_RULES_QUERY_KEY });
    },
  };

  const toggle = useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      updateRule(id, { is_enabled: isEnabled }),
    onMutate: ({ id, isEnabled }) =>
      applyOptimistic((page) => ({
        ...page,
        rules: page.rules.map((rule) =>
          rule.id === id ? { ...rule, isEnabled } : rule,
        ),
      })),
    ...rollback,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteRule(id),
    onMutate: (id) =>
      applyOptimistic((page) => ({
        ...page,
        rules: page.rules.filter((rule) => rule.id !== id),
        pagination: { ...page.pagination, total: page.pagination.total - 1 },
      })),
    ...rollback,
  });

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {rules.map((rule) => {
        const condition = `${tMetric(rule.metric)} ${rule.operator} ${rule.threshold}${unitLabel(rule.unit)}`;

        return (
          <li key={rule.id} className="flex items-start gap-3 px-3 py-2.5">
            <SeverityDot severity={rule.severity} className="mt-1.5" />

            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-medium ${rule.isEnabled ? "" : "opacity-50"}`}
              >
                {condition}
              </p>

              <p className="text-xs opacity-60">
                {tScope(rule.scope)} · {tSeverity(rule.severity)} ·{" "}
                {t("cooldown", { minutes: rule.cooldownMinutes })}
              </p>

              {rule.lastTriggeredAt && (
                <p className="text-xs opacity-50">
                  {t("lastFired", {
                    when: format.relativeTime(new Date(rule.lastTriggeredAt)),
                    value:
                      rule.lastValue === null
                        ? "—"
                        : `${rule.lastValue}${unitLabel(rule.unit)}`,
                  })}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <label className="flex cursor-pointer items-center gap-2 pr-1">
                <span className="sr-only">{t("toggle", { condition })}</span>
                <input
                  type="checkbox"
                  checked={rule.isEnabled}
                  onChange={(event) =>
                    toggle.mutate({
                      id: rule.id,
                      isEnabled: event.target.checked,
                    })
                  }
                  className="size-4 accent-sky-600"
                />
              </label>

              <button
                type="button"
                onClick={() => onEdit(rule)}
                aria-label={t("edit", { condition })}
                className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Pencil aria-hidden="true" className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => remove.mutate(rule.id)}
                aria-label={t("delete", { condition })}
                className="rounded-md p-2 text-red-600 hover:bg-red-600/10 dark:text-red-400"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
