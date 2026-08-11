"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { MapPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import {
  AREAS_QUERY_KEY,
  deleteArea,
  listAreas,
  type ManagedArea,
} from "./api";
import { AreaEditor } from "./AreaEditor";

type Editing = { area: ManagedArea | null } | null;

export function AreasPanel() {
  const t = useTranslations("govAreas");
  const tTypes = useTranslations("govAreas.types");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const format = useFormatter();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<Editing>(null);
  const [doomed, setDoomed] = useState<ManagedArea | null>(null);

  const query = useQuery({ queryKey: AREAS_QUERY_KEY, queryFn: listAreas });

  const remove = useMutation({
    mutationFn: (id: number) => deleteArea(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY });
      setDoomed(null);
    },
  });

  const areas = query.data ?? [];

  const others = editing?.area
    ? areas.filter((area) => area.id !== editing.area?.id)
    : areas;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
        </div>

        {!editing && (
          <Button type="button" onClick={() => setEditing({ area: null })}>
            <MapPlus aria-hidden="true" className="size-4" />
            {t("new")}
          </Button>
        )}
      </header>

      {query.isError && <Callout tone="error">{t("loadFailed")}</Callout>}

      {editing && (
        <AreaEditor
          key={editing.area ? `area-${editing.area.id}` : "new"}
          area={editing.area}
          others={others}
          onDone={() => setEditing(null)}
        />
      )}

      {query.isPending && <p className="text-sm opacity-70">{tCommon("loading")}</p>}

      {query.isSuccess && areas.length === 0 && !editing && (
        <div className="rounded-lg border border-dashed border-border p-6">
          <p className="text-sm font-medium">{t("empty")}</p>
          <p className="mt-1 text-sm opacity-70">{t("emptyHint")}</p>
        </div>
      )}

      {areas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {areas.map((area) => (
            <li
              key={area.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{area.name}</p>
                <p className="text-sm opacity-70">
                  {tTypes(area.areaType)}
                  {area.address ? ` · ${area.address}` : ""} ·{" "}
                  {t("size", {
                    value: format.number(area.areaKm2, {
                      maximumFractionDigits: 2,
                    }),
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditing({ area })}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  {tCommon("edit")}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDoomed(area)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  {tCommon("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={doomed !== null}
        title={t("delete.title")}
        onClose={() => setDoomed(null)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            {t("delete.confirm", { name: doomed?.name ?? "" })}
          </p>
          <p className="text-sm opacity-70">{t("delete.warning")}</p>

          {remove.isError && <Callout tone="error">{tError("generic")}</Callout>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDoomed(null)}
            >
              {tCommon("cancel")}
            </Button>

            <Button
              type="button"
              loading={remove.isPending}
              className="bg-red-600 hover:bg-red-700"
              onClick={() => doomed && remove.mutate(doomed.id)}
            >
              {tCommon("delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
