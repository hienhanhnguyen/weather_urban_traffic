"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Flag, MapPin, Star } from "lucide-react";
import { Layer, Marker, Popup, Source } from "react-map-gl/maplibre";
import type { FeatureCollection, LineString } from "geojson";
import { Button } from "@/components/ui/Button";
import { WeatherIcon } from "@/features/weather/WeatherIcon";
import type { SavedLocation } from "@/features/locations/api";
import MapCanvas from "./MapCanvas";
import type { SegmentConditions } from "./routeWeather";
import type { Endpoint, MapPoint } from "./types";

const ROUTE_SOURCE = "route";

const CASING_PAINT = {
  "line-color": "#0f172a",
  "line-width": 8,
  "line-opacity": 0.35,
} as const;

const TONE_PAINT = [
  "match",
  ["get", "tone"],
  "clear",
  "#10b981",
  "caution",
  "#f59e0b",
  "severe",
  "#dc2626",
  "#64748b",
] as unknown as string;

const PLAIN_COLOR = "#0284c7";

export interface ExplorerMapProps {
  mapRef?: React.ComponentProps<typeof MapCanvas>["mapRef"];
  initialViewState?: React.ComponentProps<typeof MapCanvas>["initialViewState"];
  origin: MapPoint | null;
  destination: MapPoint | null;
  savedLocations: SavedLocation[];
  conditions: SegmentConditions[];
  showConditions: boolean;
  onMapClick: (coordinates: { latitude: number; longitude: number }) => void;
  picked: MapPoint | null;
  pickedPending: boolean;
  onDismissPicked: () => void;
  onUsePicked: (endpoint: Endpoint) => void;
}

export default function ExplorerMap({
  mapRef,
  initialViewState,
  origin,
  destination,
  savedLocations,
  conditions,
  showConditions,
  onMapClick,
  picked,
  pickedPending,
  onDismissPicked,
  onUsePicked,
}: ExplorerMapProps) {
  const t = useTranslations("map");

  const routeGeoJson = useMemo<FeatureCollection<LineString>>(
    () => ({
      type: "FeatureCollection",
      features: conditions.map(({ segment, weather, severity }) => ({
        type: "Feature",
        properties: { tone: weather === null ? "pending" : severity },
        geometry: { type: "LineString", coordinates: segment.coordinates },
      })),
    }),
    [conditions],
  );

  const hasRoute = conditions.length > 0;

  return (
    <MapCanvas
      mapRef={mapRef}
      initialViewState={initialViewState}
      onClick={onMapClick}
    >
      {hasRoute && (
        <Source id={ROUTE_SOURCE} type="geojson" data={routeGeoJson}>
          <Layer
            id="route-casing"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={CASING_PAINT}
          />
          <Layer
            id="route-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": showConditions ? TONE_PAINT : PLAIN_COLOR,
              "line-width": 4,
            }}
          />
        </Source>
      )}

      {showConditions &&
        conditions.map(
          ({ segment, weather }, index) =>
            weather && (
              <Marker
                key={`segment-${index}`}
                longitude={segment.midpoint[0]}
                latitude={segment.midpoint[1]}
                anchor="center"
              >
                <span className="flex items-center gap-1 rounded-full border border-border bg-background/90 px-2 py-1 text-xs shadow-sm backdrop-blur">
                  <WeatherIcon
                    code={weather.weatherCode}
                    isDay={weather.isDay}
                    className="size-3.5"
                  />
                  {weather.temp !== null && (
                    <span className="tabular-nums">
                      {Math.round(weather.temp)}
                      {weather.units.temp}
                    </span>
                  )}
                </span>
              </Marker>
            ),
        )}

      {savedLocations.map((location) => (
        <Marker
          key={`saved-${location.id}`}
          longitude={location.longitude}
          latitude={location.latitude}
          anchor="center"
        >
          <span title={location.name}>
            <Star
              aria-hidden="true"
              className="size-4 text-amber-500 drop-shadow"
              fill="currentColor"
              stroke="white"
            />
            <span className="sr-only">{location.name}</span>
          </span>
        </Marker>
      ))}

      {origin && (
        <Marker
          longitude={origin.longitude}
          latitude={origin.latitude}
          anchor="bottom"
        >
          <MapPin
            aria-hidden="true"
            className="size-8 text-emerald-600 drop-shadow"
            fill="currentColor"
            stroke="white"
          />
          <span className="sr-only">{t("route.from")}</span>
        </Marker>
      )}

      {destination && (
        <Marker
          longitude={destination.longitude}
          latitude={destination.latitude}
          anchor="bottom"
        >
          <Flag
            aria-hidden="true"
            className="size-8 text-red-600 drop-shadow"
            fill="currentColor"
            stroke="white"
          />
          <span className="sr-only">{t("route.to")}</span>
        </Marker>
      )}

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
            <p className="text-xs opacity-60 tabular-nums">
              {picked.latitude.toFixed(5)}, {picked.longitude.toFixed(5)}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                className="px-3 py-1.5 text-xs"
                onClick={() => onUsePicked("origin")}
              >
                {t("route.setFrom")}
              </Button>
              <Button
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
