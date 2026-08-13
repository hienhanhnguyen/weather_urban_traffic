"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Flag, MapPin } from "lucide-react";
import { Layer, Marker, Popup, Source } from "react-map-gl/maplibre";
import type { Feature, LineString } from "geojson";
import { Button } from "@/components/ui/Button";
import MapCanvas from "./MapCanvas";
import type { Position } from "./geometry";
import type { Endpoint, MapPoint } from "./types";

const ROUTE_SOURCE = "edited-route";

const CASING_PAINT = {
  "line-color": "#0f172a",
  "line-width": 8,
  "line-opacity": 0.35,
} as const;

const LINE_PAINT = { "line-color": "#0284c7", "line-width": 4 } as const;

export interface RouteEditMapProps {
  mapRef?: React.ComponentProps<typeof MapCanvas>["mapRef"];
  initialViewState?: React.ComponentProps<typeof MapCanvas>["initialViewState"];
  start: MapPoint;
  end: MapPoint;
  coordinates: Position[] | null;
  picked: MapPoint | null;
  pickedPending: boolean;
  onMapClick: (point: { latitude: number; longitude: number }) => void;
  onMoveEndpoint: (
    endpoint: Endpoint,
    point: { latitude: number; longitude: number },
  ) => void;
  onDismissPicked: () => void;
  onUsePicked: (endpoint: Endpoint) => void;
}

export default function RouteEditMap({
  mapRef,
  initialViewState,
  start,
  end,
  coordinates,
  picked,
  pickedPending,
  onMapClick,
  onMoveEndpoint,
  onDismissPicked,
  onUsePicked,
}: RouteEditMapProps) {
  const t = useTranslations("map");

  const line = useMemo<Feature<LineString> | null>(
    () =>
      coordinates && coordinates.length > 1
        ? {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates },
          }
        : null,
    [coordinates],
  );

  const drag = (endpoint: Endpoint) => ({
    draggable: true as const,
    onDragEnd: (event: { lngLat: { lat: number; lng: number } }) =>
      onMoveEndpoint(endpoint, {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      }),
  });

  return (
    <MapCanvas
      mapRef={mapRef}
      initialViewState={initialViewState}
      onClick={onMapClick}
    >
      {line && (
        <Source id={ROUTE_SOURCE} type="geojson" data={line}>
          <Layer
            id="edited-route-casing"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={CASING_PAINT}
          />
          <Layer
            id="edited-route-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={LINE_PAINT}
          />
        </Source>
      )}

      <Marker
        longitude={start.longitude}
        latitude={start.latitude}
        anchor="bottom"
        {...drag("origin")}
      >
        <MapPin
          aria-hidden="true"
          className="size-8 text-emerald-600 drop-shadow"
          fill="currentColor"
          stroke="white"
        />
        <span className="sr-only">{t("route.from")}</span>
      </Marker>

      <Marker
        longitude={end.longitude}
        latitude={end.latitude}
        anchor="bottom"
        {...drag("destination")}
      >
        <Flag
          aria-hidden="true"
          className="size-8 text-red-600 drop-shadow"
          fill="currentColor"
          stroke="white"
        />
        <span className="sr-only">{t("route.to")}</span>
      </Marker>

      {picked && (
        <Popup
          longitude={picked.longitude}
          latitude={picked.latitude}
          anchor="bottom"
          offset={12}
          closeButton={false}
          onClose={onDismissPicked}
          maxWidth="18rem"
        >
          <div className="flex flex-col gap-2 p-1 text-foreground">
            <p className="text-sm font-medium">
              {picked.label ||
                (pickedPending ? t("picker.resolving") : t("pickedUnknown"))}
            </p>
            <p className="text-xs tabular-nums opacity-60">
              {picked.latitude.toFixed(5)}, {picked.longitude.toFixed(5)}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="px-3 py-1.5 text-xs"
                onClick={() => onUsePicked("origin")}
              >
                {t("route.setFrom")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                onClick={() => onUsePicked("destination")}
              >
                {t("route.setTo")}
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </MapCanvas>
  );
}
