"use client";

import dynamic from "next/dynamic";
import type { Point } from "@/lib/types";

// the map library is only downloaded on pages that show a map, after first paint
const RouteMap = dynamic(() => import("@/components/booking/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <span className="size-6 animate-spin rounded-full border-2 border-aqua border-t-transparent" aria-label="Chargement de la carte" />
    </div>
  ),
});

type Props = {
  polyline: string;
  pickup: { label: string; lat: number | null; lng: number | null };
  dropoff: { label: string; lat: number | null; lng: number | null };
};

/* The stored route of a reservation on the real map: streets, zoom and pan, no editing. */
export default function TripMap({ polyline, pickup, dropoff }: Props) {
  const pt = (p: Props["pickup"]): Point | null => (p.lat != null && p.lng != null ? { label: p.label, lat: p.lat, lng: p.lng } : null);
  return <RouteMap pickup={pt(pickup)} dropoff={pt(dropoff)} polyline={polyline} />;
}
