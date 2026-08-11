"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { Toggle } from "@/components/ui/Toggle";
import {
  LIMIT_REACHED_CODE,
  LOCATIONS_QUERY_KEY,
} from "@/features/locations/api";
import type { RouteProfile } from "@/features/map/api";
import type { MapPoint } from "@/features/map/types";
import {
  ROUTE_LIMIT_REACHED_CODE,
  SAVED_ROUTES_QUERY_KEY,
  createRoute,
} from "./api";
import { routeSchema, type RouteValues } from "./schemas";

const FIELDS = ["name"] as const;

const NAME_MAX = 255;

export interface SaveRouteDialogProps {
  origin: MapPoint;
  destination: MapPoint;
  profile: RouteProfile;
  distanceMeters: number;
  durationSeconds: number;
  onClose: () => void;
  onSaved: () => void;
}

export function SaveRouteDialog({
  origin,
  destination,
  profile,
  distanceMeters,
  durationSeconds,
  onClose,
  onSaved,
}: SaveRouteDialogProps) {
  const t = useTranslations("routes");
  const tCommon = useTranslations("common");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const queryClient = useQueryClient();
  const schema = useMemo(() => routeSchema(tv), [tv]);

  const [saveEndpoints, setSaveEndpoints] = useState(false);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RouteValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: t("defaultName", {
        from: origin.label || t("unnamedStart"),
        to: destination.label || t("unnamedEnd"),
      }).slice(0, NAME_MAX),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RouteValues) =>
      createRoute({
        name: values.name,
        start: {
          latitude: origin.latitude,
          longitude: origin.longitude,
          address: origin.label || null,
        },
        end: {
          latitude: destination.latitude,
          longitude: destination.longitude,
          address: destination.label || null,
        },
        profile,
        distance_m: distanceMeters,
        duration_s: durationSeconds,
        ...(saveEndpoints && {
          save_endpoints: {
            start_name: (origin.label || t("unnamedStart")).slice(0, NAME_MAX),
            end_name: (destination.label || t("unnamedEnd")).slice(0, NAME_MAX),
          },
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_ROUTES_QUERY_KEY });
      // The two endpoints only reach the locations list when they were saved,
      // but invalidating unconditionally keeps the branch out of the cache.
      void queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
      onSaved();
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");

    try {
      await mutation.mutateAsync(values);
    } catch (err) {
      if (isApiError(err) && err.code === ROUTE_LIMIT_REACHED_CODE) {
        setFormError(t("limitReached"));
        return;
      }

      if (isApiError(err) && err.code === LIMIT_REACHED_CODE) {
        setFormError(t("endpointLimitReached"));
        return;
      }

      setFormError(applyApiError(err, setError, FIELDS, tError("generic")));
    }
  });

  return (
    <Modal open title={t("saveTitle")} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t("form.name")}
          placeholder={t("form.namePlaceholder")}
          autoFocus
          error={errors.name?.message}
          {...register("name")}
        />

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="opacity-60">{t("form.from")}</dt>
          <dd className="break-words">{origin.label || t("unnamedStart")}</dd>
          <dt className="opacity-60">{t("form.to")}</dt>
          <dd className="break-words">
            {destination.label || t("unnamedEnd")}
          </dd>
        </dl>

        <Toggle
          label={t("form.saveEndpoints")}
          hint={t("form.saveEndpointsHint")}
          checked={saveEndpoints}
          onChange={(event) => setSaveEndpoints(event.target.checked)}
        />

        {formError && <Callout tone="error">{formError}</Callout>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
