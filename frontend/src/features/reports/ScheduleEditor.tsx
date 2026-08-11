"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { CalendarClock, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Select";
import { isApiError } from "@/lib/api/errors";
import type { SavedRoute } from "@/features/routes/api";
import {
  SCHEDULE_QUERY_KEY,
  deleteSchedule,
  getSchedule,
  saveSchedule,
  type ReportSchedule,
} from "./api";
import {
  DAYS_OF_MONTH,
  HOURS,
  RANGES,
  WEEKDAYS,
  checkSchedule,
  scheduleForm,
  schedulePayload,
  weekdayDate,
  type ScheduleFormState,
} from "./format";

export function ScheduleEditor({
  routes,
  routeId,
}: {
  routes: SavedRoute[];
  routeId: number | null;
}) {
  const t = useTranslations("businessReports.schedule");
  const tCommon = useTranslations("common");

  const query = useQuery({
    queryKey: SCHEDULE_QUERY_KEY,
    queryFn: getSchedule,
  });

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CalendarClock aria-hidden="true" className="size-4" />
          {t("title")}
        </h2>
        <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
      </div>

      {query.isPending && (
        <p className="text-sm opacity-70">{tCommon("loading")}</p>
      )}

      {query.isError && <Callout tone="error">{t("loadFailed")}</Callout>}

      {query.isSuccess && (
        <ScheduleFields
          key={query.data?.id ?? "new"}
          schedule={query.data}
          routes={routes}
          routeId={routeId}
        />
      )}
    </section>
  );
}

function ScheduleFields({
  schedule,
  routes,
  routeId,
}: {
  schedule: ReportSchedule | null;
  routes: SavedRoute[];
  routeId: number | null;
}) {
  const t = useTranslations("businessReports.schedule");
  const tRange = useTranslations("businessReports.ranges");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ScheduleFormState>(() =>
    scheduleForm(schedule, routeId ?? undefined),
  );
  const [problem, setProblem] = useState<string | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });

  const save = useMutation({ mutationFn: saveSchedule, onSuccess: refresh });
  const remove = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: refresh,
  });

  const patch = (fields: Partial<ScheduleFormState>) =>
    setForm({ ...form, ...fields });

  const submit = () => {
    const failed = checkSchedule(form);
    setProblem(failed ? t(`errors.${failed}`) : null);

    const body = schedulePayload(form);
    if (body) save.mutate(body);
  };

  const failure = save.error ?? remove.error;

  const stamp = (at: string | null) =>
    at === null
      ? t("never")
      : format.dateTime(new Date(at), {
          dateStyle: "medium",
          timeStyle: "short",
        });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label={t("route")}
          value={form.routeId}
          onChange={(event) => patch({ routeId: event.target.value })}
          error={problem ?? undefined}
          options={[
            { value: "", label: t("routePlaceholder") },
            ...routes.map((route) => ({
              value: String(route.id),
              label: route.name,
            })),
          ]}
        />

        <Select
          label={t("range")}
          value={form.range}
          onChange={(event) =>
            patch({ range: event.target.value as ScheduleFormState["range"] })
          }
          options={RANGES.map((range) => ({
            value: range,
            label: tRange(range),
          }))}
        />

        <Select
          label={t("frequency")}
          value={form.frequency}
          onChange={(event) =>
            patch({
              frequency: event.target.value as ScheduleFormState["frequency"],
            })
          }
          options={[
            { value: "weekly", label: t("weekly") },
            { value: "monthly", label: t("monthly") },
          ]}
        />

        {form.frequency === "weekly" ? (
          <Select
            label={t("weekday")}
            value={form.weekday}
            onChange={(event) => patch({ weekday: event.target.value })}
            options={WEEKDAYS.map((weekday) => ({
              value: String(weekday),
              label: format.dateTime(weekdayDate(weekday), {
                weekday: "long",
              }),
            }))}
          />
        ) : (
          <Select
            label={t("dayOfMonth")}
            value={form.dayOfMonth}
            onChange={(event) => patch({ dayOfMonth: event.target.value })}
            hint={t("dayOfMonthHint")}
            options={DAYS_OF_MONTH.map((day) => ({
              value: String(day),
              label: String(day),
            }))}
          />
        )}

        <Select
          label={t("hour")}
          value={form.hour}
          onChange={(event) => patch({ hour: event.target.value })}
          hint={t("hourHint")}
          options={HOURS.map((hour) => ({
            value: String(hour),
            label: `${String(hour).padStart(2, "0")}:00`,
          }))}
        />
      </div>

      {schedule && (
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="opacity-70">{t("next")}</dt>
            <dd>{stamp(schedule.nextRunAt)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="opacity-70">{t("last")}</dt>
            <dd>{stamp(schedule.lastSentAt)}</dd>
          </div>
        </dl>
      )}

      {failure && (
        <Callout tone="error">
          {isApiError(failure) ? failure.message : tErrors("generic")}
        </Callout>
      )}

      {save.isSuccess && <Callout tone="success">{t("saved")}</Callout>}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={save.isPending}>
          <Save aria-hidden="true" className="size-4" />
          {tCommon("save")}
        </Button>

        {schedule && (
          <Button
            type="button"
            variant="secondary"
            loading={remove.isPending}
            onClick={() => remove.mutate()}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {t("stop")}
          </Button>
        )}
      </div>
    </form>
  );
}
