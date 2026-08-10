"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PlaceSearch } from "@/features/map/PlaceSearch";
import { LOCATIONS_QUERY_KEY, listLocations } from "@/features/locations/api";

export interface WeatherPlace {
  latitude: number;
  longitude: number;
  label: string;
}

const SAVED_PLACEHOLDER = "";

export function PlaceSelector({
  value,
  onChange,
}: {
  value: WeatherPlace | null;
  onChange: (place: WeatherPlace) => void;
}) {
  const t = useTranslations("weather");

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  const saved = useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: listLocations,
  });

  const locations = saved.data?.locations ?? [];

  const selected = locations.find(
    (location) =>
      value !== null &&
      location.latitude === value.latitude &&
      location.longitude === value.longitude,
  );

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError(t("locateUnsupported"));
      return;
    }

    setLocating(true);
    setLocateError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: t("myLocation"),
        });
      },
      () => {
        setLocating(false);
        setLocateError(t("locateFailed"));
      },
      { timeout: 10_000 },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <PlaceSearch
        onSelect={(place) =>
          onChange({
            latitude: place.latitude,
            longitude: place.longitude,
            label: place.name,
          })
        }
        focus={value ?? undefined}
        placeholder={t("searchPlaceholder")}
      />

      <div className="flex flex-wrap items-end gap-3">
        {locations.length > 0 && (
          <Select
            label={t("savedLabel")}
            className="min-w-48"
            value={selected ? String(selected.id) : SAVED_PLACEHOLDER}
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

        <Button
          type="button"
          variant="secondary"
          onClick={useMyLocation}
          loading={locating}
        >
          <LocateFixed aria-hidden="true" className="size-4" />
          {t("useMyLocation")}
        </Button>
      </div>

      {locateError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {locateError}
        </p>
      )}
    </div>
  );
}
