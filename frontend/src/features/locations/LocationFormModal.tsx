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
import {
  LocationPicker,
  type PickedLocation,
} from "@/features/map/LocationPicker";
import {
  LIMIT_REACHED_CODE,
  LOCATIONS_QUERY_KEY,
  createLocation,
  updateLocation,
  type SavedLocation,
} from "./api";
import { locationSchema, type LocationValues } from "./schemas";

const FIELDS = ["name", "address"] as const;

export interface LocationFormModalProps {
  location: SavedLocation | null;
  onClose: () => void;
}

export function LocationFormModal({
  location,
  onClose,
}: LocationFormModalProps) {
  const t = useTranslations("locations");
  const tCommon = useTranslations("common");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const queryClient = useQueryClient();
  const schema = useMemo(() => locationSchema(tv), [tv]);

  const [picked, setPicked] = useState<PickedLocation | null>(
    location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address ?? "",
        }
      : null,
  );
  const [pickError, setPickError] = useState("");
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LocationValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: location?.name ?? "",
      address: location?.address ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: LocationValues) => {
      if (!picked) throw new Error("no point selected");

      const body = {
        custom_name: values.name,
        address: values.address === "" ? null : values.address,
        latitude: picked.latitude,
        longitude: picked.longitude,
      };

      return location
        ? updateLocation(location.id, body)
        : createLocation(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
      onClose();
    },
  });

  const onPick = (value: PickedLocation) => {
    setPicked(value);
    setPickError("");

    if (value.address) {
      setValue("address", value.address, { shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");

    if (!picked) {
      setPickError(t("form.placeRequired"));
      return;
    }

    try {
      await mutation.mutateAsync(values);
    } catch (err) {
      if (isApiError(err) && err.code === LIMIT_REACHED_CODE) {
        setFormError(t("limitReached"));
        return;
      }
      setFormError(applyApiError(err, setError, FIELDS, tError("generic")));
    }
  });

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={location ? t("editTitle") : t("addTitle")}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t("form.name")}
          placeholder={t("form.namePlaceholder")}
          autoFocus
          error={errors.name?.message}
          {...register("name")}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium">{t("form.place")}</p>
          <LocationPicker value={picked} onChange={onPick} />
          {pickError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {pickError}
            </p>
          )}
        </div>

        <TextField
          label={t("form.address")}
          placeholder={t("form.addressPlaceholder")}
          error={errors.address?.message}
          hint={t("form.addressHint")}
          {...register("address")}
        />

        {formError && <Callout tone="error">{formError}</Callout>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {location ? tCommon("save") : tCommon("add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
