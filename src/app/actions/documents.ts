"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { requireAdmin } from "@/lib/server/auth";
import { one, query, transaction } from "@/lib/server/db";
import { PhotoError, processDocument } from "@/lib/server/photos";
import { MAX_DOCUMENTS } from "@/lib/photos";
import { clean, toInt } from "@/lib/validate";

export type DocResult = { ok: true } | { ok: false; error: string };
const ID_MAX = 2_147_483_647;

const refresh = (reservationId: number, userId?: number) => {
  revalidatePath(`/admin/reservations/${reservationId}`);
  if (userId) revalidatePath(`/admin/clients/${userId}`);
};

export async function uploadDocumentAction(form: FormData): Promise<DocResult> {
  const admin = await requireAdmin();
  const rid = toInt(form.get("reservationId"), 1, ID_MAX);
  const f = form.get("photo");
  if (!rid) return { ok: false, error: "Réservation introuvable." };
  if (!(f instanceof File) || f.size === 0) return { ok: false, error: "Aucune photo reçue." };
  let userId: number | undefined;
  try {
    const img = await processDocument(Buffer.from(await f.arrayBuffer()));
    await transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock($1, $2)", [7303, rid]);
      const r = await db.query<{ user_id: number }>("SELECT user_id FROM reservations WHERE id = $1", [rid]);
      if (!r.rows[0]) throw new PhotoError("Réservation introuvable.");
      userId = r.rows[0].user_id;
      const { rows } = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM reservation_documents WHERE reservation_id = $1", [rid]);
      if (rows[0].n >= MAX_DOCUMENTS) throw new PhotoError(`${MAX_DOCUMENTS} documents maximum par réservation.`);
      await db.query(
        "INSERT INTO reservation_documents (reservation_id, uploaded_by, label, width, height, small, large, bytes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [rid, admin.id, clean(form.get("label"), 80), img.width, img.height, img.small, img.large, img.bytes],
      );
    });
  } catch (err) {
    if (err instanceof PhotoError) return { ok: false, error: err.message };
    console.error("document upload failed", err);
    return { ok: false, error: "Envoi impossible. Réessayez." };
  }
  refresh(rid, userId);
  return { ok: true };
}

/* rotate the stored image itself, so it stays the right way up for everyone */
export async function rotateDocumentAction(id: number, turn: 90 | 270): Promise<DocResult> {
  await requireAdmin();
  const did = toInt(id, 1, ID_MAX);
  if (!did || (turn !== 90 && turn !== 270)) return { ok: false, error: "Rotation invalide." };
  const row = await one<{ large: Buffer; reservation_id: number }>("SELECT large, reservation_id FROM reservation_documents WHERE id = $1", [did]);
  if (!row) return { ok: false, error: "Document introuvable." };
  const large = await sharp(row.large).rotate(turn).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const small = await sharp(large.data).resize({ width: 480, height: 480, fit: "inside" }).webp({ quality: 70 }).toBuffer();
  await query(
    "UPDATE reservation_documents SET large = $2, small = $3, width = $4, height = $5, bytes = $6, version = version + 1 WHERE id = $1",
    [did, large.data, small, large.info.width, large.info.height, large.data.length + small.length],
  );
  refresh(row.reservation_id);
  return { ok: true };
}

export async function renameDocumentAction(id: number, label: string): Promise<DocResult> {
  await requireAdmin();
  const did = toInt(id, 1, ID_MAX);
  if (!did) return { ok: false, error: "Document introuvable." };
  const row = await one<{ reservation_id: number }>("UPDATE reservation_documents SET label = $2 WHERE id = $1 RETURNING reservation_id", [did, clean(label, 80)]);
  if (row) refresh(row.reservation_id);
  return { ok: true };
}

export async function deleteDocumentAction(id: number): Promise<DocResult> {
  await requireAdmin();
  const did = toInt(id, 1, ID_MAX);
  if (!did) return { ok: false, error: "Document introuvable." };
  const row = await one<{ reservation_id: number }>("DELETE FROM reservation_documents WHERE id = $1 RETURNING reservation_id", [did]);
  if (row) refresh(row.reservation_id);
  return { ok: true };
}
