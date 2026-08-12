"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { AreaTally } from "./api";
import { pendingShare } from "./filters";
import { SeverityBadge } from "./StatusBadge";

export function AreaTallyTable({ areas }: { areas: AreaTally[] }) {
  const t = useTranslations("govDashboard.areas");
  const format = useFormatter();

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-sm opacity-70">{t("subtitle")}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-border text-left">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                {t("name")}
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                {t("total")}
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                {t("pending")}
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                {t("worst")}
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                {t("last")}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {areas.map((area) => (
              <tr key={area.areaId}>
                <th scope="row" className="px-4 py-2 text-left font-medium">
                  {area.name}
                </th>

                <td className="px-4 py-2 text-right tabular-nums">
                  {format.number(area.total)}
                </td>

                <td className="px-4 py-2 text-right tabular-nums">
                  {area.total === 0
                    ? "—"
                    : t("pendingValue", {
                        count: area.pending,
                        percent: pendingShare(area.total, area.pending),
                      })}
                </td>

                <td className="px-4 py-2">
                  {area.worstSeverity ? (
                    <SeverityBadge severity={area.worstSeverity} />
                  ) : (
                    <span className="opacity-50">{t("quiet")}</span>
                  )}
                </td>

                <td className="px-4 py-2 opacity-70">
                  {area.lastAt ? (
                    <time dateTime={area.lastAt}>
                      {format.relativeTime(new Date(area.lastAt))}
                    </time>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
