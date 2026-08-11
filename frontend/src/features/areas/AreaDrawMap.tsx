"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Layer, Source } from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawCircleMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import MapCanvas from "@/features/map/MapCanvas";
import { boundsOf } from "@/features/map/geometry";
import type { ManagedArea } from "./api";
import { areaCollection, polygonOf, type Ring } from "./geometry";

export type DrawMode = "polygon" | "circle" | "select";

const MODES: readonly DrawMode[] = ["polygon", "circle", "select"];

const FILL = "#0ea5e9";
const OUTLINE = "#0284c7";
const SAVED = "#64748b";

const OUTLINE_STYLE = {
  fillColor: FILL,
  fillOpacity: 0.25,
  outlineColor: OUTLINE,
  outlineWidth: 2,
} as const;

const isPolygon = (feature: GeoJSONStoreFeatures) =>
  feature.geometry.type === "Polygon";

const ringOfSnapshot = (draw: TerraDraw): Ring | null => {
  const drawn = draw.getSnapshot().filter(isPolygon);
  const latest = drawn[drawn.length - 1];

  return latest ? (latest.geometry.coordinates[0] as Ring) : null;
};

export default function AreaDrawMap({
  seedKey,
  initialRing,
  others,
  onChange,
}: {
  seedKey: string;
  initialRing: Ring | null;
  others: ManagedArea[];
  onChange: (ring: Ring | null) => void;
}) {
  const t = useTranslations("govAreas.draw");

  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [mode, setMode] = useState<DrawMode>("polygon");

  const drawRef = useRef<TerraDraw | null>(null);
  const publishRef = useRef(onChange);
  const seededRef = useRef<string | null>(null);

  useEffect(() => {
    publishRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!map) return;

    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [
        new TerraDrawPolygonMode({ editable: true, styles: OUTLINE_STYLE }),
        new TerraDrawCircleMode({ styles: OUTLINE_STYLE }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
            circle: { feature: { draggable: true } },
          },
        }),
      ],
    });

    const publish = () => publishRef.current(ringOfSnapshot(draw));

    const finish = () => {
      const drawn = draw.getSnapshot().filter(isPolygon);
      const stale = drawn.slice(0, -1).map((feature) => feature.id!);

      if (stale.length > 0) draw.removeFeatures(stale);
      publish();
    };

    draw.on("change", publish);
    draw.on("finish", finish);

    draw.start();
    draw.setMode("polygon");
    drawRef.current = draw;

    return () => {
      draw.off("change", publish);
      draw.off("finish", finish);
      draw.stop();
      drawRef.current = null;
      seededRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !map || seededRef.current === seedKey) return;

    seededRef.current = seedKey;
    draw.clear();

    if (!initialRing) return;

    draw.addFeatures([
      {
        type: "Feature",
        geometry: polygonOf(initialRing),
        properties: { mode: "polygon" },
      },
    ]);

    const bounds = boundsOf(initialRing);
    if (bounds) map.fitBounds(bounds, { padding: 48, duration: 0 });
  }, [seedKey, initialRing, map]);

  const changeMode = (next: DrawMode) => {
    drawRef.current?.setMode(next);
    setMode(next);
  };

  const clear = () => {
    drawRef.current?.clear();
    onChange(null);
  };

  const saved = areaCollection(others);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label={t("mode")}
          className="flex gap-1 rounded-md border border-border p-1"
        >
          {MODES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === mode}
              onClick={() => changeMode(option)}
              className={
                "rounded px-3 py-1.5 text-sm " +
                (option === mode
                  ? "bg-sky-600 text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/10")
              }
            >
              {t(option)}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          {t("clear")}
        </button>

        <p className="text-sm opacity-70">{t(`hint.${mode}`)}</p>
      </div>

      <div className="h-[26rem] overflow-hidden rounded-lg border border-border">
        <MapCanvas onReady={setMap}>
          <Source id="saved-areas" type="geojson" data={saved}>
            <Layer
              id="saved-areas-fill"
              type="fill"
              paint={{ "fill-color": SAVED, "fill-opacity": 0.12 }}
            />
            <Layer
              id="saved-areas-line"
              type="line"
              paint={{
                "line-color": SAVED,
                "line-width": 1.5,
                "line-dasharray": [2, 2],
              }}
            />
          </Source>
        </MapCanvas>
      </div>
    </div>
  );
}
