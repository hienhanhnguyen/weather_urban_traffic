"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { LOCATIONS_QUERY_KEY, listLocations, type SavedLocation } from "./api";
import { LocationRow } from "./LocationRow";
import { LocationFormModal } from "./LocationFormModal";
import { DeleteLocationDialog } from "./DeleteLocationDialog";

type FormState = { location: SavedLocation | null } | null;

export function LocationsPanel() {
  const t = useTranslations("locations");
  const tCommon = useTranslations("common");

  const [form, setForm] = useState<FormState>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedLocation | null>(
    null,
  );

  const query = useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: listLocations,
  });

  const locations = query.data?.locations ?? [];
  const total = query.data?.pagination.total ?? 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm opacity-70">
            {query.isSuccess ? t("count", { count: total }) : t("subtitle")}
          </p>
        </div>

        <Button className="ml-auto" onClick={() => setForm({ location: null })}>
          <Plus aria-hidden="true" className="size-4" />
          {t("add")}
        </Button>
      </div>

      {query.isPending && (
        <p className="text-sm opacity-70">{tCommon("loading")}</p>
      )}

      {query.isError && (
        <Callout tone="error">
          {t("loadFailed")}{" "}
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="underline underline-offset-4"
          >
            {tCommon("tryAgain")}
          </button>
        </Callout>
      )}

      {query.isSuccess && locations.length === 0 && (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">{t("empty")}</p>
          <p className="mt-1 text-sm opacity-70">{t("emptyHint")}</p>
        </div>
      )}

      {locations.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {locations.map((location) => (
            <LocationRow
              key={location.id}
              location={location}
              onEdit={(value) => setForm({ location: value })}
              onDelete={setPendingDelete}
            />
          ))}
        </ul>
      )}

      {total > locations.length && (
        <p className="text-sm opacity-70">
          {t("truncated", { shown: locations.length, total })}
        </p>
      )}

      {form && (
        <LocationFormModal
          location={form.location}
          onClose={() => setForm(null)}
        />
      )}

      {pendingDelete && (
        <DeleteLocationDialog
          location={pendingDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
