"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { SAVED_ROUTES_QUERY_KEY, deleteRoute, type SavedRoute } from "./api";

export interface DeleteRouteDialogProps {
  route: SavedRoute;
  onClose: () => void;
}

export function DeleteRouteDialog({ route, onClose }: DeleteRouteDialogProps) {
  const t = useTranslations("routes.delete");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");

  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => deleteRoute(route.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_ROUTES_QUERY_KEY });
      onClose();
    },
    onError: () => setError(tError("generic")),
  });

  return (
    <Modal open title={t("title")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm">{t("confirm", { name: route.name })}</p>
        <p className="text-sm opacity-70">{t("warning")}</p>

        {error && <Callout tone="error">{error}</Callout>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {tCommon("delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
