"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PREFERENCES_QUERY_KEY, getPreferences } from "@/features/account/api";
import { PushError } from "./client";
import { PushDeviceRow } from "./PushDeviceRow";
import { usePush } from "./usePush";

export function PushPanel() {
  const t = useTranslations("account.push");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");

  const { config, local, devices, enable, disable, remove } = usePush();

  const preferences = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: getPreferences,
  });

  if (config.isPending || local.isPending) {
    return <p className="text-sm opacity-70">{t("loading")}</p>;
  }

  if (config.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="error">{t("loadFailed")}</Callout>
        <Button variant="secondary" onClick={() => config.refetch()}>
          {tCommon("tryAgain")}
        </Button>
      </div>
    );
  }

  if (!config.data.enabled) {
    return <p className="text-sm opacity-70">{t("serverDisabled")}</p>;
  }

  if (local.isError || !local.data.supported) {
    return <p className="text-sm opacity-70">{t("unsupported")}</p>;
  }

  const denied = local.data.permission === "denied";
  const subscribed = local.data.endpoint !== null;
  const failure = enable.error ?? disable.error ?? remove.error;
  const list = devices.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {failure && (
        <Callout tone="error">
          {failure instanceof PushError
            ? t(`errors.${failure.reason}`)
            : tError("generic")}
        </Callout>
      )}

      {denied ? (
        <Callout tone="info">{t("blocked")}</Callout>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {subscribed ? (
            <>
              <Button
                variant="secondary"
                loading={disable.isPending}
                onClick={() => disable.mutate()}
              >
                {t("disable")}
              </Button>
              <span className="text-sm opacity-70">{t("enabledHere")}</span>
            </>
          ) : (
            <Button loading={enable.isPending} onClick={() => enable.mutate()}>
              {t("enable")}
            </Button>
          )}
        </div>
      )}

      {subscribed && preferences.data?.pushAlertsEnabled === false && (
        <Callout tone="info">{t("preferenceOff")}</Callout>
      )}

      <div>
        <h3 className="text-sm font-medium">{t("devices")}</h3>

        {devices.isError ? (
          <p className="mt-2 text-sm opacity-70">{t("devicesFailed")}</p>
        ) : list.length === 0 ? (
          <p className="mt-2 text-sm opacity-70">{t("noDevices")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {list.map((device) => (
              <PushDeviceRow
                key={device.id}
                device={device}
                isThisDevice={device.endpoint === local.data.endpoint}
                removing={remove.isPending}
                onRemove={() => remove.mutate(device)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
