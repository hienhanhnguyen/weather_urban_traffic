"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Map, {
  AttributionControl,
  GeolocateControl,
  NavigationControl,
  ScaleControl,
  type MapLayerMouseEvent,
  type MapRef,
  type ViewState,
} from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/lib/theme/ThemeProvider";
import {
  ATTRIBUTION,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLE_DARK,
  MAP_STYLE_LIGHT,
} from "@/lib/map/config";

export interface MapCanvasProps {
  initialViewState?: Partial<ViewState>;
  onClick?: (coordinates: { latitude: number; longitude: number }) => void;
  onReady?: (map: MapLibreMap) => void;
  mapRef?: React.Ref<MapRef>;
  interactive?: boolean;
  children?: React.ReactNode;
}

export default function MapCanvas({
  initialViewState,
  onClick,
  onReady,
  mapRef,
  interactive = true,
  children,
}: MapCanvasProps) {
  const t = useTranslations("map");
  const { resolved } = useTheme();
  const mapStyle = resolved === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  const [viewState] = useState(() => ({
    ...DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    ...initialViewState,
  }));

  const loadedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={viewState}
        mapStyle={mapStyle}
        interactive={interactive}
        attributionControl={false}
        onClick={
          onClick &&
          ((event: MapLayerMouseEvent) =>
            onClick({
              latitude: event.lngLat.lat,
              longitude: event.lngLat.lng,
            }))
        }
        onLoad={(event) => {
          loadedRef.current = true;
          setFailed(false);
          event.target.resize();
          onReady?.(event.target);
        }}
        onError={(event: { error: Error }) => {
          console.error("[map]", event.error);
          if (!loadedRef.current) setFailed(true);
        }}
        style={{ width: "100%", height: "100%" }}
        cursor={onClick ? "crosshair" : undefined}
      >
        <AttributionControl customAttribution={ATTRIBUTION} compact />
        {interactive && (
          <>
            <NavigationControl position="top-right" showCompass={false} />
            <GeolocateControl position="top-right" trackUserLocation />
            <ScaleControl position="bottom-left" />
          </>
        )}
        {children}
      </Map>

      {failed && (
        <p
          role="alert"
          className="absolute inset-0 z-10 flex items-center justify-center bg-surface p-4 text-center text-sm"
        >
          {t("loadFailed")}
        </p>
      )}
    </div>
  );
}
