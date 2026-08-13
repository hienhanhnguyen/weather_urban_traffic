"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { MapRef } from "react-map-gl/maplibre";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { DETAIL_ZOOM } from "@/lib/map/config";
import { ROUTE_QUERY_KEY, getRoute, reverseGeocode } from "@/features/map/api";
import { boundsOf, type Position } from "@/features/map/geometry";
import { useRouteFormat } from "@/features/map/format";
import type { Endpoint, MapPoint } from "@/features/map/types";
import {
  SAVED_ROUTES_QUERY_KEY,
  updateRoute,
  type RouteEndpoint,
  type SavedRoute,
} from "./api";
import { RouteLegs } from "./RouteLegs";
import { routeSchema, type RouteValues } from "./schemas";

// Dynamic boundary. Everything below it may import MapLibre freely.
const RouteEditMap = dynamic(() => import("@/features/map/RouteEditMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface" />,
});

const FIELDS = ["name"] as const;

const FIT_PADDING = 48;

const STALE_TIME = 5 * 60 * 1000;

const toPoint = (endpoint: RouteEndpoint): MapPoint => ({
  latitude: endpoint.latitude,
  longitude: endpoint.longitude,
  label: endpoint.address ?? "",
});

const toEndpoint = (point: MapPoint) => ({
  latitude: point.latitude,
  longitude: point.longitude,
  address: point.label || null,
});

const moved = (point: MapPoint, endpoint: RouteEndpoint) =>
  point.latitude !== endpoint.latitude ||
  point.longitude !== endpoint.longitude;

export interface EditRouteDialogProps {
  route: SavedRoute;
  onClose: () => void;
}

export function EditRouteDialog({ route, onClose }: EditRouteDialogProps) {
  const t = useTranslations("routes");
  const tMap = useTranslations("map");
  const tCommon = useTranslations("common");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const queryClient = useQueryClient();
  const schema = useMemo(() => routeSchema(tv), [tv]);
  const format = useRouteFormat();

  const mapRef = useRef<MapRef>(null);

  const [start, setStart] = useState(() => toPoint(route.start));
  const [end, setEnd] = useState(() => toPoint(route.end));
  const [formError, setFormError] = useState("");

  const [picked, setPicked] = useState<MapPoint | null>(null);
  const [pickedPending, setPickedPending] = useState(false);
  const pickedRef = useRef<string | null>(null);
  const draggedRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RouteValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: route.name },
  });

  const leg = useQuery({
    queryKey: [
      ...ROUTE_QUERY_KEY,
      start.latitude,
      start.longitude,
      end.latitude,
      end.longitude,
      route.profile,
    ],
    queryFn: () => getRoute(start, end, route.profile),
    staleTime: STALE_TIME,
  });

  const coordinates = (leg.data?.geometry.coordinates ?? null) as
    | Position[]
    | null;

  useEffect(() => {
    if (!coordinates) return;
    const bounds = boundsOf(coordinates);
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: FIT_PADDING });
  }, [coordinates]);

  const setEndpoint = (endpoint: Endpoint, point: MapPoint) => {
    if (endpoint === "origin") setStart(point);
    else setEnd(point);
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
    setEndpoint(endpoint, picked);
    setPicked(null);
    pickedRef.current = null;
    draggedRef.current = null;
  };

  const moveEndpoint = async (
    endpoint: Endpoint,
    point: { latitude: number; longitude: number },
  ) => {
    const key = `${endpoint}:${point.latitude},${point.longitude}`;
    draggedRef.current = key;
    setEndpoint(endpoint, { ...point, label: "" });

    try {
      const place = await reverseGeocode(point.latitude, point.longitude);
      if (draggedRef.current !== key) return;
      setEndpoint(endpoint, {
        ...point,
        label: place?.address || place?.name || "",
      });
    } catch {}
  };

  const mutation = useMutation({
    mutationFn: (values: RouteValues) => {
      const relocated = moved(start, route.start) || moved(end, route.end);

      return updateRoute(route.id, {
        name: values.name,
        start: toEndpoint(start),
        end: toEndpoint(end),
        ...(relocated && {
          distance_m: leg.data?.distanceMeters ?? null,
          duration_s: leg.data?.durationSeconds ?? null,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_ROUTES_QUERY_KEY });
      onClose();
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");

    try {
      await mutation.mutateAsync(values);
    } catch (err) {
      setFormError(applyApiError(err, setError, FIELDS, tError("generic")));
    }
  });

  return (
    <Modal open size="lg" title={t("editTitle")} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t("form.name")}
          autoFocus
          error={errors.name?.message}
          {...register("name")}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium">{t("form.leg")}</p>
          <p className="mb-2 text-xs opacity-70">{t("form.mapHint")}</p>

          <div className="h-80 overflow-hidden rounded-lg border border-border">
            <RouteEditMap
              mapRef={mapRef}
              initialViewState={{
                latitude: route.start.latitude,
                longitude: route.start.longitude,
                zoom: DETAIL_ZOOM,
              }}
              start={start}
              end={end}
              coordinates={coordinates}
              picked={picked}
              pickedPending={pickedPending}
              onMapClick={pick}
              onMoveEndpoint={moveEndpoint}
              onDismissPicked={() => setPicked(null)}
              onUsePicked={usePicked}
            />
          </div>

          <RouteLegs start={toEndpoint(start)} end={toEndpoint(end)} />

          <p aria-live="polite" className="mt-1 min-h-5 text-xs opacity-60">
            {leg.isFetching ? (
              tMap("route.calculating")
            ) : leg.data ? (
              <span className="tabular-nums">
                {format.distance(leg.data.distanceMeters)} ·{" "}
                {format.duration(leg.data.durationSeconds)}
              </span>
            ) : (
              tMap("route.noRoute")
            )}
          </p>
        </div>

        {formError && <Callout tone="error">{formError}</Callout>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={leg.isFetching}
          >
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
