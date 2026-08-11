"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Crosshair, Maximize2 } from "lucide-react";
import type { MapRef } from "react-map-gl/maplibre";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Toggle } from "@/components/ui/Toggle";
import { LOCATIONS_QUERY_KEY, listLocations } from "@/features/locations/api";
import { DEFAULT_CENTER, DEFAULT_ZOOM, DETAIL_ZOOM } from "@/lib/map/config";
import {
  ROUTE_QUERY_KEY,
  getRoute,
  reverseGeocode,
  type RouteProfile,
} from "./api";
import { boundsOf, type Position } from "./geometry";
import { RoutePlanner } from "./RoutePlanner";
import { RouteSummary } from "./RouteSummary";
import { useRouteConditions } from "./routeWeather";
import type { Endpoint, MapPoint } from "./types";

const ExplorerMap = dynamic(() => import("./ExplorerMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface" />,
});

const FIT_PADDING = 64;

function useFocusFromUrl() {
  const params = useSearchParams();
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));

  const valid =
    params.has("lat") &&
    params.has("lng") &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  return valid ? { latitude, longitude } : null;
}

export function MapExplorer() {
  const t = useTranslations("map");

  const mapRef = useRef<MapRef>(null);
  const focus = useFocusFromUrl();

  const [origin, setOrigin] = useState<MapPoint | null>(null);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [profile, setProfile] = useState<RouteProfile>("driving");
  const [showConditions, setShowConditions] = useState(true);

  const [picked, setPicked] = useState<MapPoint | null>(null);
  const [pickedPending, setPickedPending] = useState(false);
  const pickedRef = useRef<string | null>(null);

  const saved = useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: listLocations,
  });

  const route = useQuery({
    queryKey: [
      ...ROUTE_QUERY_KEY,
      origin?.latitude,
      origin?.longitude,
      destination?.latitude,
      destination?.longitude,
      profile,
    ],
    queryFn:
      origin && destination
        ? () => getRoute(origin, destination, profile)
        : skipToken,
    staleTime: 5 * 60 * 1000,
  });

  const coordinates = (route.data?.geometry.coordinates ?? null) as
    | Position[]
    | null;

  const conditions = useRouteConditions(coordinates, {
    enabled: showConditions,
  });

  useEffect(() => {
    if (!coordinates) return;
    const bounds = boundsOf(coordinates);
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: FIT_PADDING });
  }, [coordinates]);

  const setEndpoint = (endpoint: Endpoint, point: MapPoint | null) => {
    if (endpoint === "origin") setOrigin(point);
    else setDestination(point);
  };

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const pick = async (point: { latitude: number; longitude: number }) => {
    const key = `${point.latitude},${point.longitude}`;
    pickedRef.current = key;

    setPicked({ ...point, label: "" });
    setPickedPending(true);

    try {
      const place = await reverseGeocode(point.latitude, point.longitude);
      if (pickedRef.current !== key) return;
      setPicked({ ...point, label: place?.address || place?.name || "" });
    } catch {
      if (pickedRef.current === key) setPicked({ ...point, label: "" });
    } finally {
      if (pickedRef.current === key) setPickedPending(false);
    }
  };

  const usePicked = (endpoint: Endpoint) => {
    if (!picked) return;
    setEndpoint(endpoint, {
      ...picked,
      label: picked.label || t("pickedUnknown"),
    });
    setPicked(null);
    pickedRef.current = null;
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: DETAIL_ZOOM,
        }),
      () => {},
      { timeout: 10_000 },
    );
  };

  const fitRoute = () => {
    if (!coordinates) return;
    const bounds = boundsOf(coordinates);
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: FIT_PADDING });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{t("explore.title")}</h1>
        <p className="mt-1 text-sm opacity-70">{t("explore.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="flex flex-col gap-4">
          <RoutePlanner
            origin={origin}
            destination={destination}
            profile={profile}
            onSet={setEndpoint}
            onSwap={swap}
            onProfileChange={setProfile}
          />

          <Toggle
            label={t("route.conditionsToggle")}
            hint={t("route.conditionsHint")}
            checked={showConditions}
            onChange={(event) => setShowConditions(event.target.checked)}
          />

          {route.isError && (
            <Callout tone="error">
              {t("route.failed")}{" "}
              <button
                type="button"
                onClick={() => void route.refetch()}
                className="underline underline-offset-4"
              >
                {t("route.retry")}
              </button>
            </Callout>
          )}

          {route.isFetching && (
            <p className="text-sm opacity-70">{t("route.calculating")}</p>
          )}

          {route.data === null && !route.isFetching && (
            <Callout tone="info">{t("route.noRoute")}</Callout>
          )}

          {route.data && (
            <RouteSummary
              route={route.data}
              conditions={conditions}
              showConditions={showConditions}
            />
          )}

          {conditions.isError && showConditions && (
            <p className="text-sm opacity-70">{t("route.conditionsFailed")}</p>
          )}
        </div>

        <div className="relative h-[70vh] min-h-96 overflow-hidden rounded-lg border border-border">
          <ExplorerMap
            mapRef={mapRef}
            initialViewState={
              focus
                ? { ...focus, zoom: DETAIL_ZOOM }
                : { ...DEFAULT_CENTER, zoom: DEFAULT_ZOOM }
            }
            origin={origin}
            destination={destination}
            savedLocations={saved.data?.locations ?? []}
            conditions={conditions.segments}
            showConditions={showConditions}
            onMapClick={pick}
            picked={picked}
            pickedPending={pickedPending}
            onDismissPicked={() => setPicked(null)}
            onUsePicked={usePicked}
          />

          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={locate}
              aria-label={t("controls.myLocation")}
              title={t("controls.myLocation")}
              className="bg-background/90 px-2 py-2 backdrop-blur"
            >
              <Crosshair aria-hidden="true" className="size-4" />
            </Button>

            <Button
              variant="secondary"
              onClick={fitRoute}
              disabled={!coordinates}
              aria-label={t("controls.fitRoute")}
              title={t("controls.fitRoute")}
              className="bg-background/90 px-2 py-2 backdrop-blur"
            >
              <Maximize2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
