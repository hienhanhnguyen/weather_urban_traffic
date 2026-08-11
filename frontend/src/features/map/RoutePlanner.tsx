"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown, LocateFixed, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DEFAULT_CENTER } from "@/lib/map/config";
import { reverseGeocode, type RouteProfile } from "./api";
import { PlaceSearch } from "./PlaceSearch";
import type { Endpoint, MapPoint } from "./types";

const PROFILES: RouteProfile[] = ["driving", "cycling", "walking"];

export interface RoutePlannerProps {
  origin: MapPoint | null;
  destination: MapPoint | null;
  profile: RouteProfile;
  onSet: (endpoint: Endpoint, point: MapPoint | null) => void;
  onSwap: () => void;
  onProfileChange: (profile: RouteProfile) => void;
}

export function RoutePlanner({
  origin,
  destination,
  profile,
  onSet,
  onSwap,
  onProfileChange,
}: RoutePlannerProps) {
  const t = useTranslations("map.route");
  const tCommon = useTranslations("common");

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  const points: Record<Endpoint, MapPoint | null> = { origin, destination };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError(t("locateUnsupported"));
      return;
    }

    setLocating(true);
    setLocateError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        onSet("origin", { ...point, label: t("myLocation") });
        setLocating(false);

        try {
          const place = await reverseGeocode(point.latitude, point.longitude);
          if (place) {
            onSet("origin", { ...point, label: place.address || place.name });
          }
        } catch {}
      },
      () => {
        setLocating(false);
        setLocateError(t("locateFailed"));
      },
      { timeout: 10_000 },
    );
  };

  const field = (endpoint: Endpoint) => {
    const point = points[endpoint];

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide opacity-60">
            {t(endpoint === "origin" ? "from" : "to")}
          </span>

          {endpoint === "origin" && (
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="inline-flex items-center gap-1 text-xs underline underline-offset-4 disabled:opacity-60"
            >
              <LocateFixed aria-hidden="true" className="size-3.5" />
              {t("useMyLocation")}
            </button>
          )}
        </div>

        <PlaceSearch
          onSelect={(place) =>
            onSet(endpoint, {
              latitude: place.latitude,
              longitude: place.longitude,
              label: place.address || place.name,
            })
          }
          focus={point ?? origin ?? DEFAULT_CENTER}
          placeholder={t(
            endpoint === "origin" ? "fromPlaceholder" : "toPlaceholder",
          )}
        />

        {point && (
          <p className="flex items-start gap-2 rounded-md bg-surface px-2 py-1.5 text-sm">
            <span className="min-w-0 flex-1 break-words">{point.label}</span>
            <button
              type="button"
              onClick={() => onSet(endpoint, null)}
              aria-label={t("clearEndpoint", { label: point.label })}
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {field("origin")}

      <div className="flex justify-center">
        <Button
          variant="secondary"
          onClick={onSwap}
          disabled={!origin && !destination}
          aria-label={t("swap")}
          className="px-2 py-1"
        >
          <ArrowUpDown aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {field("destination")}

      <Select
        label={t("profile")}
        value={profile}
        onChange={(event) =>
          onProfileChange(event.target.value as RouteProfile)
        }
        options={PROFILES.map((value) => ({
          value,
          label: t(`profiles.${value}`),
        }))}
      />

      {locateError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {locateError}
        </p>
      )}

      {(origin || destination) && (
        <button
          type="button"
          onClick={() => {
            onSet("origin", null);
            onSet("destination", null);
          }}
          className="self-start text-xs underline underline-offset-4 opacity-70"
        >
          {tCommon("clear")}
        </button>
      )}
    </div>
  );
}
