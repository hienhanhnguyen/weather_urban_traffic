"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { MapPin, X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { PlaceSearch } from "@/features/map/PlaceSearch";
import { LOCATIONS_QUERY_KEY, listLocations } from "@/features/locations/api";

export interface RiskPlace {
  latitude: number;
  longitude: number;
  label: string;
}

const SAVED_PLACEHOLDER = "";

export function PlaceField({
  label,
  placeholder,
  value,
  onChange,
  onClear,
  error,
}: {
  label: string;
  placeholder: string;
  value: RiskPlace | null;
  onChange: (place: RiskPlace) => void;
  onClear?: () => void;
  error?: string;
}) {
  const t = useTranslations("risk.form");

  const saved = useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: listLocations,
  });

  const locations = saved.data?.locations ?? [];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>

      <PlaceSearch
        onSelect={(place) =>
          onChange({
            latitude: place.latitude,
            longitude: place.longitude,
            label: place.name,
          })
        }
        focus={value ?? undefined}
        placeholder={placeholder}
      />

      {locations.length > 0 && (
        <Select
          label={t("savedLabel")}
          className="text-sm"
          value={SAVED_PLACEHOLDER}
          onChange={(event) => {
            const match = locations.find(
              (location) => String(location.id) === event.target.value,
            );
            if (!match) return;
            onChange({
              latitude: match.latitude,
              longitude: match.longitude,
              label: match.name,
            });
          }}
          options={[
            { value: SAVED_PLACEHOLDER, label: t("savedPlaceholder") },
            ...locations.map((location) => ({
              value: String(location.id),
              label: location.name,
            })),
          ]}
        />
      )}

      {value && (
        <p className="flex items-center gap-1.5 text-sm">
          <MapPin aria-hidden="true" className="size-4 shrink-0 opacity-60" />
          <span className="truncate">{value.label}</span>

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label={t("clearPlace")}
              className="ml-auto rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
