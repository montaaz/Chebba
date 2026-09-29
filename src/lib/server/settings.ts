import "server-only";
import { one, query } from "./db";
import type { Car, Place, Settings } from "../types";

/* Tariffs are read on almost every request and change rarely: keep them in
   memory for a few seconds. Admin saves clear the cache immediately. */
const TTL = 15_000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export const clearConfigCache = () => cache.clear();

export const getSettings = () =>
  cached("settings", async () => {
    const row = await one<Settings>("SELECT * FROM settings WHERE id = 1");
    if (!row) throw new Error("settings row missing — run `npm run db:seed`");
    return row;
  });

export const getActiveCars = () =>
  cached("cars", () => query<Car>("SELECT * FROM cars WHERE is_active ORDER BY sort_order, id"));

export const getActivePlaces = () =>
  cached("places", () => query<Place>("SELECT * FROM places WHERE is_active ORDER BY sort_order, id"));
