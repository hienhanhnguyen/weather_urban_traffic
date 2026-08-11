"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { isApiError } from "@/lib/api/errors";
import {
  AREAS_QUERY_KEY,
  createArea,
  updateArea,
  type AreaType,
  type ManagedArea,
} from "./api";
import {
  AREA_TYPES,
  areaErrorCode,
  areaForm,
  areaPayload,
  checkArea,
  emptyAreaForm,
  isDrawn,
  ringAreaKm2,
  ringOf,
  type Ring,
} from "./geometry";

const AreaDrawMap = dynamic(() => import("./AreaDrawMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[26rem] animate-pulse rounded-lg border border-border" />
  ),
});

export function AreaEditor({
  area,
  others,
  onDone,
}: {
  area: ManagedArea | null;
  others: ManagedArea[];
  onDone: () => void;
}) {
  const t = useTranslations("govAreas");
  const tTypes = useTranslations("govAreas.types");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() =>
    area ? areaForm(area) : emptyAreaForm,
  );
  const [ring, setRing] = useState<Ring | null>(() =>
    area ? ringOf(area.boundary) : null,
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = areaPayload(form, ring);
      if (!payload) throw new Error("incomplete area");

      return area ? updateArea(area.id, payload) : createArea(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY });
      onDone();
    },
  });

  const problem = checkArea(form, ring);
  const code = areaErrorCode(
    isApiError(save.error) ? save.error.code : undefined,
  );

  const size = isDrawn(ring)
    ? t("size", {
        value: format.number(ringAreaKm2(ring), {
          maximumFractionDigits: 2,
        }),
      })
    : t("sizeUnknown");

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {area ? t("editTitle", { name: area.name }) : t("newTitle")}
        </h2>
        <p className="text-sm opacity-70">{size}</p>
      </div>

      <AreaDrawMap
        seedKey={area ? `area-${area.id}` : "new"}
        initialRing={area ? ringOf(area.boundary) : null}
        others={others}
        onChange={setRing}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label={t("fields.name")}
          value={form.name}
          maxLength={120}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
        />

        <Select
          label={t("fields.type")}
          value={form.areaType}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              areaType: event.target.value as AreaType,
            }))
          }
          options={AREA_TYPES.map((option) => ({
            value: option,
            label: tTypes(option),
          }))}
        />

        <TextField
          label={t("fields.address")}
          value={form.address}
          maxLength={255}
          hint={t("fields.addressHint")}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, address: event.target.value }))
          }
        />
      </div>

      {problem && (
        <p className="text-sm opacity-70">{t(`problems.${problem}`)}</p>
      )}

      {save.isError && (
        <Callout tone="error">
          {code
            ? t(`errors.${code}`)
            : isApiError(save.error)
              ? save.error.message
              : tErrors("generic")}
        </Callout>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          loading={save.isPending}
          disabled={problem !== null}
          onClick={() => save.mutate()}
        >
          {area ? t("save") : t("create")}
        </Button>

        <Button type="button" variant="secondary" onClick={onDone}>
          {t("cancel")}
        </Button>
      </div>
    </section>
  );
}
