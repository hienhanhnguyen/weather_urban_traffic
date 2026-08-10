"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { DEFAULT_CENTER, DEFAULT_ZOOM, DETAIL_ZOOM } from "@/lib/map/config";
import { reverseGeocode, type GeoPlace } from "./api";
import { PlaceSearch } from "./PlaceSearch";
import type { MapRef } from "react-map-gl/maplibre";

// Dynamic boundary. Everything below it may import MapLibre freely.
const PickerMap = dynamic(() => import("./PickerMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface" />,
});

export interface PickedLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (value: PickedLocation) => void;
  className?: string;
  mapHeightClass?: string;
}

const format = (value: number) => value.toFixed(5);

export function LocationPicker({
  value,
  onChange,
  className,
  mapHeightClass = "h-72",
}: LocationPickerProps) {
  const t = useTranslations("map.picker");

  const mapRef = useRef<MapRef>(null);
  const pendingRef = useRef<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const flyTo = (latitude: number, longitude: number) => {
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: DETAIL_ZOOM });
  };

  const pick = async (coordinates: { latitude: number; longitude: number }) => {
    const key = `${coordinates.latitude},${coordinates.longitude}`;
    pendingRef.current = key;

    // Move the pin immediately when has the address.
    onChange({ ...coordinates, address: "" });
    setResolving(true);

    try {
      const place = await reverseGeocode(
        coordinates.latitude,
        coordinates.longitude,
      );
      if (pendingRef.current !== key) return;
      onChange({
        ...coordinates,
        address: place?.address ?? place?.name ?? "",
      });
    } catch {
      if (pendingRef.current === key) onChange({ ...coordinates, address: "" });
    } finally {
      if (pendingRef.current === key) setResolving(false);
    }
  };

  const selectPlace = (place: GeoPlace) => {
    pendingRef.current = null;
    setResolving(false);
    onChange({
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address || place.name,
    });
    flyTo(place.latitude, place.longitude);
  };

  return (
    <div className={className}>
      <PlaceSearch
        onSelect={selectPlace}
        focus={value ?? DEFAULT_CENTER}
        placeholder={t("searchPlaceholder")}
      />

      <p className="mt-2 text-xs opacity-70">{t("hint")}</p>

      <div
        className={`mt-2 overflow-hidden rounded-lg border border-border ${mapHeightClass}`}
      >
        <PickerMap
          mapRef={mapRef}
          value={value}
          onPick={pick}
          initialViewState={
            value
              ? {
                  latitude: value.latitude,
                  longitude: value.longitude,
                  zoom: DETAIL_ZOOM,
                }
              : { ...DEFAULT_CENTER, zoom: DEFAULT_ZOOM }
          }
        />
      </div>

      <p aria-live="polite" className="mt-2 min-h-5 text-sm">
        {value ? (
          <>
            <span className="opacity-70">
              {format(value.latitude)}, {format(value.longitude)}
            </span>
            {value.address && <span> — {value.address}</span>}
            {resolving && <span className="opacity-60"> {t("resolving")}</span>}
          </>
        ) : (
          <span className="opacity-70">{t("nothingSelected")}</span>
        )}
      </p>
    </div>
  );
}
