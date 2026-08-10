"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LocationPicker, type PickedLocation } from "@/features/map/LocationPicker";

export default function MapPage() {
  const t = useTranslations("map.explore");
  const [selected, setSelected] = useState<PickedLocation | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
      </div>

      <LocationPicker
        value={selected}
        onChange={setSelected}
        mapHeightClass="h-[60vh] min-h-96"
      />
    </div>
  );
}
