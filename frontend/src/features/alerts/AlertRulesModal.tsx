"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import type { SavedLocation } from "@/features/locations/api";
import {
  listLocationRules,
  locationRulesQueryKey,
  type AlertRule,
} from "./api";
import { AlertRuleForm } from "./AlertRuleForm";
import { AlertRuleList } from "./AlertRuleList";

export interface AlertRulesModalProps {
  location: SavedLocation;
  onClose: () => void;
}

export function AlertRulesModal({ location, onClose }: AlertRulesModalProps) {
  const t = useTranslations("alerts");
  const tCommon = useTranslations("common");

  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [saved, setSaved] = useState(0);
  const [error, setError] = useState("");

  const afterSave = () => {
    setEditing(null);
    setSaved((count) => count + 1);
  };

  const query = useQuery({
    queryKey: locationRulesQueryKey(location.id),
    queryFn: () => listLocationRules(location.id),
  });

  const rules = query.data?.rules ?? [];

  return (
    <Modal open size="lg" title={t("title")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm opacity-70">
          {t("subtitle", { name: location.name })}
        </p>

        {error && <Callout tone="error">{error}</Callout>}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">
            {t("existing")}
          </h3>

          {query.isPending && (
            <p className="text-sm opacity-70">{tCommon("loading")}</p>
          )}

          {query.isError && (
            <Callout tone="error">
              {t("loadFailed")}{" "}
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="underline underline-offset-4"
              >
                {tCommon("tryAgain")}
              </button>
            </Callout>
          )}

          {query.isSuccess && rules.length === 0 && (
            <p className="text-sm opacity-70">{t("empty")}</p>
          )}

          {rules.length > 0 && (
            <AlertRuleList
              locationId={location.id}
              rules={rules}
              onEdit={(rule) => {
                setError("");
                setEditing(rule);
              }}
              onError={setError}
            />
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">
            {editing ? t("editTitle") : t("addTitle")}
          </h3>

          <AlertRuleForm
            key={editing?.id ?? `new-${saved}`}
            locationId={location.id}
            rule={editing}
            onDone={afterSave}
            onCancel={editing ? () => setEditing(null) : undefined}
          />
        </section>
      </div>
    </Modal>
  );
}
