"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/auth";
import { one, query, transaction } from "@/lib/server/db";
import { PhotoError, processPhoto } from "@/lib/server/photos";
import { clearConfigCache } from "@/lib/server/settings";
import { MAX_PHOTOS } from "@/lib/photos";
import { toInt } from "@/lib/validate";

export type PhotoResult = { ok: true } | { ok: false; error: string };

const ID_MAX = 2_147_483_647;

function published() {
  clearConfigCache();
  revalidatePath("/", "layout");
}

const fileOf = async (form: FormData) => {
  const f = form.get("photo");
  if (!(f instanceof File) || f.size === 0) throw new PhotoError("Aucune photo reçue.");
  return processPhoto(Buffer.from(await f.arrayBuffer()));
};

/* one photo per request: keeps every upload small and lets the page show progress */
export async function uploadPhotoAction(form: FormData): Promise<PhotoResult> {
  await requireAdmin();
  const carId = toInt(form.get("carId"), 1, ID_MAX);
  if (!carId) return { ok: false, error: "Véhicule introuvable." };
  try {
    const img = await fileOf(form);
    await transaction(async (db) => {
      // one upload at a time per car, so two quick uploads cannot both pass the limit of 10
      await db.query("SELECT pg_advisory_xact_lock($1, $2)", [7302, carId]);
      const { rows } = await db.query<{ n: number; next: number }>(
        "SELECT count(*)::int AS n, coalesce(max(position), -1)::int + 1 AS next FROM car_photos WHERE car_id = $1",
        [carId],
      );
      if (rows[0].n >= MAX_PHOTOS) throw new PhotoError(`${MAX_PHOTOS} photos maximum par véhicule.`);
      await db.query(
        "INSERT INTO car_photos (car_id, position, width, height, small, large, bytes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [carId, rows[0].next, img.width, img.height, img.small, img.large, img.bytes],
      );
    });
  } catch (err) {
    if (err instanceof PhotoError) return { ok: false, error: err.message };
    if ((err as { code?: string }).code === "23503") return { ok: false, error: "Véhicule introuvable." };
    console.error("photo upload failed", err);
    return { ok: false, error: "Envoi impossible. Réessayez." };
  }
  published();
  return { ok: true };
}

export async function replacePhotoAction(form: FormData): Promise<PhotoResult> {
  await requireAdmin();
  const id = toInt(form.get("id"), 1, ID_MAX);
  if (!id) return { ok: false, error: "Photo introuvable." };
  try {
    const img = await fileOf(form);
    const row = await one<{ id: number }>(
      "UPDATE car_photos SET width = $2, height = $3, small = $4, large = $5, bytes = $6, version = version + 1 WHERE id = $1 RETURNING id",
      [id, img.width, img.height, img.small, img.large, img.bytes],
    );
    if (!row) return { ok: false, error: "Photo introuvable." };
  } catch (err) {
    if (err instanceof PhotoError) return { ok: false, error: err.message };
    console.error("photo replace failed", err);
    return { ok: false, error: "Remplacement impossible. Réessayez." };
  }
  published();
  return { ok: true };
}

export async function deletePhotoAction(id: number): Promise<PhotoResult> {
  await requireAdmin();
  const pid = toInt(id, 1, ID_MAX);
  if (!pid) return { ok: false, error: "Photo introuvable." };
  await query("DELETE FROM car_photos WHERE id = $1", [pid]);
  published();
  return { ok: true };
}

/* the whole new order in one go: positions are rewritten 0..n-1 for that car */
export async function reorderPhotosAction(carId: number, ids: number[]): Promise<PhotoResult> {
  await requireAdmin();
  const cid = toInt(carId, 1, ID_MAX);
  if (!cid || !Array.isArray(ids) || ids.length > MAX_PHOTOS || ids.some((i) => !toInt(i, 1, ID_MAX))) return { ok: false, error: "Ordre invalide." };
  const changed = await transaction(async (db) => {
    const { rows } = await db.query<{ id: number }>("SELECT id FROM car_photos WHERE car_id = $1 FOR UPDATE", [cid]);
    const own = new Set(rows.map((r) => r.id));
    if (ids.length !== own.size || ids.some((i) => !own.has(i))) return false;
    // one statement: position = place in the submitted list
    await db.query(
      "UPDATE car_photos p SET position = o.pos - 1 FROM unnest($2::int[]) WITH ORDINALITY AS o(id, pos) WHERE p.id = o.id AND p.car_id = $1",
      [cid, ids],
    );
    return true;
  });
  if (!changed) return { ok: false, error: "La liste des photos a changé : rechargez la page." };
  published();
  return { ok: true };
}
