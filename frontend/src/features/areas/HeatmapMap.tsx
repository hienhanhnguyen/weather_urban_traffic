"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";
import MapCanvas from "@/features/map/MapCanvas";
import type { AlertSeverity } from "@/features/notifications/api";
import type { AreaTally } from "@/features/incidents/api";
import type { HeatmapArea } from "./heatmap-api";
import { boundsOfAreas, heatmapCollection, incidentPins } from "./heatmap";

const FILL_LAYER = "heatmap-areas-fill";

const PIN_TONE: Record<AlertSeverity, string> = {
  info: "bg-slate-600",
  warning: "bg-amber-500",
  critical: "bg-red-600",
};

export default function HeatmapMap({
  areas,
  tallies,
  selectedId,
  onSelect,
}: {
  areas: HeatmapArea[];
  tallies: AreaTally[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const t = useTranslations("govHeatmap");

  const [map, setMap] = useState<MapLibreMap | null>(null);

  const span = areas.map((area) => area.id).join(",");
  const fittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || fittedRef.current === span) return;

    fittedRef.current = span;

    const bounds = boundsOfAreas(areas);
    if (bounds) map.fitBounds(bounds, { padding: 48, duration: 0 });
  }, [map, span, areas]);

  const collection = heatmapCollection(areas, selectedId);
  const pins = incidentPins(areas, tallies);

  return (
    <MapCanvas
      onReady={setMap}
      interactiveLayerIds={[FILL_LAYER]}
      onClick={(click) => {
        const hit = click.features?.[0]?.properties?.id;
        onSelect(typeof hit === "number" ? hit : null);
      }}
    >
      <Source id="heatmap-areas" type="geojson" data={collection}>
        <Layer
          id={FILL_LAYER}
          type="fill"
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": ["get", "opacity"],
          }}
        />
        <Layer
          id="heatmap-areas-line"
          type="line"
          paint={{
            "line-color": ["get", "color"],
            "line-width": ["case", ["get", "selected"], 3.5, 1.5],
          }}
        />
      </Source>

      {pins.map((pin) => (
        <Marker
          key={pin.areaId}
          latitude={pin.center.latitude}
          longitude={pin.center.longitude}
        >
          <button
            type="button"
            onClick={() => onSelect(pin.areaId)}
            title={t("pin", { name: pin.name, total: pin.total })}
            className={
              "flex size-7 items-center justify-center rounded-full border-2 " +
              "border-white text-xs font-semibold tabular-nums text-white shadow " +
              (pin.worstSeverity ? PIN_TONE[pin.worstSeverity] : "bg-slate-500")
            }
          >
            {pin.total}
          </button>
        </Marker>
      ))}
    </MapCanvas>
  );
}
