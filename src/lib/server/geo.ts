import "server-only";
import type { Point, Route } from "../types";

const OSRM = (process.env.OSRM_URL ?? "https://router.project-osrm.org").replace(/\/$/, "");
const GEOCODER = (process.env.GEOCODER_URL ?? "https://photon.komoot.io").replace(/\/$/, "");
const UA = "ChebbaAutoCar/1.0";

/* Service area: Tunisia. Anything outside is refused before any upstream call. */
export const AREA = { minLat: 30.2, maxLat: 37.6, minLng: 7.5, maxLng: 11.7 };

export const inArea = (lat: unknown, lng: unknown): boolean =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= AREA.minLat &&
  lat <= AREA.maxLat &&
  lng >= AREA.minLng &&
  lng <= AREA.maxLng;

/* Small LRU: the same airport → hotel routes are asked for again and again. */
class Lru<T> {
  private map = new Map<string, { at: number; value: T }>();
  constructor(
    private max: number,
    private ttl: number,
  ) {}
  get(key: string) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.map.delete(key);
    if (Date.now() - hit.at > this.ttl) return undefined;
    this.map.set(key, hit);
    return hit.value;
  }
  set(key: string, value: T) {
    this.map.set(key, { at: Date.now(), value });
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }
}

const routes = new Lru<Route>(1000, 6 * 3_600_000);
const searches = new Lru<Point[]>(500, 24 * 3_600_000);

const r5 = (n: number) => n.toFixed(5);

export async function getRoute(a: { lat: number; lng: number }, b: { lat: number; lng: number }): Promise<Route> {
  const key = `${r5(a.lat)},${r5(a.lng)};${r5(b.lat)},${r5(b.lng)}`;
  const hit = routes.get(key);
  if (hit) return hit;

  const url = `${OSRM}/route/v1/driving/${r5(a.lng)},${r5(a.lat)};${r5(b.lng)},${r5(b.lat)}?overview=simplified&geometries=polyline&alternatives=false&steps=false`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000), cache: "no-store" });
  if (!res.ok) throw new Error(`routing ${res.status}`);
  const data = (await res.json()) as {
    code: string;
    routes?: { distance: number; duration: number; geometry: string }[];
  };
  const best = data.routes?.[0];
  if (data.code !== "Ok" || !best) throw new Error("no route");

  const route: Route = {
    km: Math.round(best.distance / 10) / 100,
    minutes: Math.max(1, Math.round(best.duration / 60)),
    polyline: best.geometry,
  };
  routes.set(key, route);
  return route;
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
};

export async function searchPlaces(q: string): Promise<Point[]> {
  const term = q.trim().toLowerCase().slice(0, 80);
  if (term.length < 3) return [];
  const hit = searches.get(term);
  if (hit) return hit;

  const bbox = `${AREA.minLng},${AREA.minLat},${AREA.maxLng},${AREA.maxLat}`;
  const url = `${GEOCODER}/api/?q=${encodeURIComponent(term)}&limit=6&lang=fr&bbox=${bbox}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(7000), cache: "no-store" });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };

  const seen = new Set<string>();
  const points: Point[] = [];
  for (const f of data.features ?? []) {
    const [lng, lat] = f.geometry.coordinates;
    if (!inArea(lat, lng)) continue;
    const label = labelOf(f.properties);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    points.push({ label, lat, lng });
  }
  searches.set(term, points);
  return points;
}

/* "Place, Town" — the street only when there is no place name, the region only when nothing else says where */
const labelOf = (p: Record<string, string | undefined>) => {
  const town = p.city ?? p.town ?? p.village ?? p.locality ?? p.district ?? p.county;
  const parts = [p.name ?? (p.street ? `${p.housenumber ? p.housenumber + " " : ""}${p.street}` : undefined), town];
  if (parts.filter(Boolean).length < 2) parts.push(p.state?.replace(/^Gouvernorat /, ""));
  const out: string[] = [];
  for (const x of parts) if (x && !out.some((o) => o.toLowerCase() === x.toLowerCase())) out.push(x);
  return out.join(", ").slice(0, 200);
};

/* Name for a point clicked on the map. Falls back to plain coordinates. */
export async function reversePlace(lat: number, lng: number): Promise<Point> {
  const fallback = { label: `Point sur la carte (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng };
  try {
    const res = await fetch(`${GEOCODER}/reverse?lat=${r5(lat)}&lon=${r5(lng)}&lang=fr&limit=1`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const label = data.features?.[0] ? labelOf(data.features[0].properties) : "";
    return label ? { label, lat, lng } : fallback;
  } catch {
    return fallback;
  }
}

/* Per-IP sliding window, enough to stop a script from hammering the free map servers. */
const hits = new Map<string, number[]>();
export function allow(ip: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
