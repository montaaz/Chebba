"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { decodePolyline } from "@/lib/polyline";
import type { Point } from "@/lib/types";

// OpenStreetMap France style: place names in French where they exist (the default style shows local Arabic names)
const TILES = process.env.NEXT_PUBLIC_TILE_URL || "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png";
const TUNISIA: [[number, number], [number, number]] = [
  [30.2, 7.5],
  [37.6, 11.7],
];

type Props = {
  pickup: Point | null;
  dropoff: Point | null;
  polyline: string;
  onPick: (lat: number, lng: number) => void;
};

/* The map library is only downloaded on the booking page, after first paint. */
export default function RouteMap({ pickup, dropoff, polyline, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const [credit, setCredit] = useState(false);
  const pick = useRef(onPick);
  pick.current = onPick;

  const draw = () => {
    const L = leaflet.current;
    if (!L || !map.current || !layer.current) return;
    layer.current.clearLayers();

    const pin = (p: Point, kind: "a" | "b") =>
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "",
          html: `<span class="map-pin map-pin--${kind}"><b>${kind.toUpperCase()}</b></span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        }),
        title: p.label,
        keyboard: false,
      }).addTo(layer.current!);

    if (pickup) pin(pickup, "a");
    if (dropoff) pin(dropoff, "b");

    const path = polyline && pickup && dropoff ? decodePolyline(polyline) : [];
    if (path.length > 1) {
      L.polyline(path, { color: "#021a1c", weight: 9, opacity: 0.55 }).addTo(layer.current);
      L.polyline(path, { color: "#86cfcf", weight: 4.5, opacity: 1, lineCap: "round" }).addTo(layer.current);
      map.current.fitBounds(L.latLngBounds(path), { paddingTopLeft: [70, 56], paddingBottomRight: [40, 34], maxZoom: 14 });
    } else if (pickup && dropoff) {
      map.current.fitBounds(L.latLngBounds([pickup, dropoff].map((p) => [p.lat, p.lng])), { paddingTopLeft: [70, 60], paddingBottomRight: [48, 40] });
    } else if (pickup ?? dropoff) {
      const p = (pickup ?? dropoff)!;
      map.current.setView([p.lat, p.lng], 12);
    }
  };

  useEffect(() => {
    let dead = false;
    let watcher: ResizeObserver | undefined;
    import("leaflet").then((mod) => {
      if (dead || !el.current || map.current) return;
      const L = mod.default ?? mod;
      leaflet.current = L;
      const m = L.map(el.current, { zoomControl: true, tapHold: false, attributionControl: false, maxBounds: [[28, 5], [39.5, 14]] });
      m.fitBounds(TUNISIA);
      // a short, wide phone map would otherwise zoom out to the whole Mediterranean
      if (m.getZoom() < 6) m.setView([35.6, 9.9], 6);
      L.tileLayer(TILES, {
        maxZoom: 18,
        minZoom: 5,
        subdomains: "abc",
      }).addTo(m);
      m.on("click", (e) => pick.current(e.latlng.lat, e.latlng.lng));
      layer.current = L.layerGroup().addTo(m);
      map.current = m;
      draw();
      // rotation, the on-screen keyboard or a step change all resize the box
      watcher = new ResizeObserver(() => {
        if (!el.current?.offsetWidth) return;
        m.invalidateSize();
        draw();
      });
      watcher.observe(el.current);
    });
    return () => {
      dead = true;
      watcher?.disconnect();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(draw, [pickup, dropoff, polyline]);

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="route-map h-full w-full" role="application" aria-label="Carte de l'itinéraire" />
      {/* The map data licence requires this credit; it stays one tap away instead of covering the map. */}
      <div className="absolute right-1 bottom-1 z-[500] flex items-center justify-end">
        {credit && (
          <span className="mr-1 rounded-md bg-night/85 px-2 py-1 text-[10px] text-mist backdrop-blur">
            ©{" "}
            <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              OpenStreetMap
            </a>{" "}
            · OSM France
          </span>
        )}
        <button
          type="button"
          className="grid size-11 cursor-pointer place-items-center"
          aria-label={credit ? "Masquer les crédits de la carte" : "Crédits de la carte"}
          aria-expanded={credit}
          onClick={() => setCredit((c) => !c)}
        >
          <span className="grid size-5 place-items-center rounded-full bg-night/70 font-serif text-[11px] leading-none text-fog italic">i</span>
        </button>
      </div>
    </div>
  );
}
