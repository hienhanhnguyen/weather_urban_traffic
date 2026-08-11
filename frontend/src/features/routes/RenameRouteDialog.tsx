"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { applyApiError } from "@/lib/forms/api-errors";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { SAVED_ROUTES_QUERY_KEY, renameRoute, type SavedRoute } from "./api";
import { routeSchema, type RouteValues } from "./schemas";

const FIELDS = ["name"] as const;

export interface RenameRouteDialogProps {
  route: SavedRoute;
  onClose: () => void;
}

export function RenameRouteDialog({ route, onClose }: RenameRouteDialogProps) {
  const t = useTranslations("routes");
  const tCommon = useTranslations("common");
  const tv = useTranslations("validation");
  const tError = useTranslations("errors");

  const queryClient = useQueryClient();
  const schema = useMemo(() => routeSchema(tv), [tv]);

  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RouteValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: route.name },
  });

  const mutation = useMutation({
    mutationFn: (values: RouteValues) => renameRoute(route.id, values.name),
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
    <Modal open title={t("renameTitle")} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t("form.name")}
          autoFocus
          error={errors.name?.message}
          {...register("name")}
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
