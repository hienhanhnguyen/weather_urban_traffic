"use client";

import { MapPin } from "lucide-react";
import { Marker } from "react-map-gl/maplibre";
import MapCanvas from "./MapCanvas";

export interface PickerMapProps {
  value: { latitude: number; longitude: number } | null;
  onPick: (coordinates: { latitude: number; longitude: number }) => void;
  mapRef?: React.ComponentProps<typeof MapCanvas>["mapRef"];
  initialViewState?: React.ComponentProps<typeof MapCanvas>["initialViewState"];
}

export default function PickerMap({
  value,
  onPick,
  mapRef,
  initialViewState,
}: PickerMapProps) {
  return (
    <MapCanvas
      mapRef={mapRef}
      initialViewState={initialViewState}
      onClick={onPick}
    >
      {value && (
        <Marker
          longitude={value.longitude}
          latitude={value.latitude}
          anchor="bottom"
          draggable
          onDragEnd={(event) =>
            onPick({
              latitude: event.lngLat.lat,
              longitude: event.lngLat.lng,
            })
          }
        >
          <MapPin
            aria-hidden="true"
            className="size-8 text-sky-600 drop-shadow"
            fill="currentColor"
            stroke="white"
          />
        </Marker>
      )}
    </MapCanvas>
  );
}
