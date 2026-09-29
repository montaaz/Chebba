"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/auth";
import { reservationById } from "@/lib/server/booking";
import { isUniqueViolation, query, transaction } from "@/lib/server/db";
import { inArea } from "@/lib/server/geo";
import { clientBody, clientTitle, mailStatus, notifyClient } from "@/lib/server/notify";
import { clearConfigCache } from "@/lib/server/settings";
import { NEXT_STATUS } from "@/lib/format";
import { clean, isEmail, isPhone, toAmount, toInt } from "@/lib/validate";
import type { Status } from "@/lib/types";

export type FormState = { error?: string; saved?: boolean };

const ID_MAX = 2_147_483_647;

/* Every admin action re-checks the role itself: hiding a page is not access control. */
function published() {
  clearConfigCache();
  revalidatePath("/", "layout");
}

export async function saveSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const v = {
    currency: clean(form.get("currency"), 6) || "DT",
    price_per_km: toAmount(form.get("price_per_km"), 10_000),
    transfer_base_fee: toAmount(form.get("transfer_base_fee")),
    transfer_min_price: toAmount(form.get("transfer_min_price")),
    round_trip_discount_pct: toAmount(form.get("round_trip_discount_pct"), 100),
    night_surcharge_pct: toAmount(form.get("night_surcharge_pct"), 500),
    night_start_hour: toInt(form.get("night_start_hour"), 0, 23),
    night_end_hour: toInt(form.get("night_end_hour"), 0, 23),
    max_transfer_km: toInt(form.get("max_transfer_km"), 1, 5000),
    min_lead_hours: toInt(form.get("min_lead_hours"), 0, 720),
  };
  if (Object.values(v).some((x) => x === null)) return { error: "Vérifiez les valeurs saisies : un champ est invalide." };

  const phone = clean(form.get("contact_phone"), 24);
  const whatsapp = clean(form.get("contact_whatsapp"), 24).replace(/\D/g, "");
  const email = clean(form.get("contact_email"), 160);
  if (phone && !isPhone(phone)) return { error: "Le téléphone de contact est invalide." };
  if (email && !isEmail(email)) return { error: "L'e-mail de contact est invalide." };

  await query(
    `UPDATE settings SET currency=$1, price_per_km=$2, transfer_base_fee=$3, transfer_min_price=$4,
        round_trip_discount_pct=$5, night_surcharge_pct=$6, night_start_hour=$7, night_end_hour=$8,
        max_transfer_km=$9, min_lead_hours=$10, contact_phone=$11, contact_whatsapp=$12, contact_email=$13,
        updated_at=now()
      WHERE id = 1`,
    [...Object.values(v), phone, whatsapp, email],
  );
  published();
  return { saved: true };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

export async function saveCarAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = toInt(form.get("id"), 1, ID_MAX);
  const make = clean(form.get("make"), 40);
  const model = clean(form.get("model"), 40);
  const trim = clean(form.get("trim_level"), 40);
  const year = toInt(form.get("model_year"), 1990, 2100);
  const seats = toInt(form.get("seats"), 1, 60);
  const luggage = toInt(form.get("luggage"), 0, 60);
  const units = toInt(form.get("units"), 0, 1000);
  const sort = toInt(form.get("sort_order"), -10_000, 10_000) ?? 0;
  const perDay = toAmount(form.get("price_per_day"));
  const perKmRaw = clean(form.get("price_per_km"), 20);
  const perKm = perKmRaw === "" ? null : toAmount(perKmRaw, 10_000);
  const transmission = form.get("transmission") === "manual" ? "manual" : "automatic";
  const fuel = ["petrol", "diesel", "hybrid", "electric"].includes(String(form.get("fuel")))
    ? String(form.get("fuel"))
    : "petrol";
  const image = clean(form.get("image"), 80).replace(/[^a-z0-9-]/gi, "");

  if (!make || !model) return { error: "La marque et le modèle sont obligatoires." };
  if (year === null || seats === null || luggage === null || units === null || perDay === null)
    return { error: "Vérifiez les valeurs numériques." };
  if (perKmRaw !== "" && perKm === null) return { error: "Le prix au km est invalide." };

  const values = [
    make, model, trim, year, seats, luggage, transmission, fuel, image, units,
    form.get("for_rental") === "on", form.get("for_transfer") === "on", perDay, perKm,
    form.get("is_active") === "on", sort,
  ];
  try {
    if (id) {
      await query(
        `UPDATE cars SET make=$1, model=$2, trim_level=$3, model_year=$4, seats=$5, luggage=$6, transmission=$7,
            fuel=$8, image=$9, units=$10, for_rental=$11, for_transfer=$12, price_per_day=$13, price_per_km=$14,
            is_active=$15, sort_order=$16
          WHERE id = $17`,
        [...values, id],
      );
    } else {
      const slug = `${slugify(`${make} ${model} ${trim}`)}-${Date.now().toString(36).slice(-4)}`;
      await query(
        `INSERT INTO cars (make, model, trim_level, model_year, seats, luggage, transmission, fuel, image, units,
            for_rental, for_transfer, price_per_day, price_per_km, is_active, sort_order, slug)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [...values, slug],
      );
    }
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "Ce véhicule existe déjà." };
    throw err;
  }
  published();
  revalidatePath("/admin/vehicules");
  return { saved: true };
}

export async function savePlaceAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const name = clean(form.get("name"), 80);
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const kind = ["airport", "agency", "city", "hotel", "port"].includes(String(form.get("kind")))
    ? String(form.get("kind"))
    : "city";
  if (!name) return { error: "Indiquez le nom du lieu." };
  if (!inArea(lat, lng)) return { error: "Les coordonnées doivent être situées en Tunisie." };
  await query(
    "INSERT INTO places (name, kind, lat, lng, sort_order) VALUES ($1, $2, $3, $4, (SELECT coalesce(max(sort_order), 0) + 1 FROM places))",
    [name, kind, lat, lng],
  );
  published();
  revalidatePath("/admin/tarifs");
  return { saved: true };
}

export async function deletePlaceAction(form: FormData) {
  await requireAdmin();
  const id = toInt(form.get("id"), 1, ID_MAX);
  if (!id) return;
  await query("DELETE FROM places WHERE id = $1", [id]);
  published();
  revalidatePath("/admin/tarifs");
}

export async function setStatusAction(form: FormData) {
  const admin = await requireAdmin();
  const id = toInt(form.get("id"), 1, ID_MAX);
  const to = String(form.get("status")) as Status;
  if (!id) return;
  const r = await reservationById(id);
  if (!r || !NEXT_STATUS[r.status].includes(to)) return;

  const changed = await transaction(async (db) => {
    // the status in the WHERE clause makes two admins clicking at once harmless
    const { rowCount } = await db.query(
      "UPDATE reservations SET status = $1, updated_at = now() WHERE id = $2 AND status = $3",
      [to, id, r.status],
    );
    if (!rowCount) return false;
    await db.query(
      "INSERT INTO reservation_events (reservation_id, actor_id, from_status, to_status, note) VALUES ($1, $2, $3, $4, $5)",
      [id, admin.id, r.status, to, clean(form.get("note"), 500)],
    );
    await notifyClient(db, r.user_id, {
      reservationId: id,
      kind: to,
      title: `${clientTitle(to)} · ${r.reference}`,
      body: clientBody(to),
    });
    return true;
  });
  if (changed) {
    const client = await query<{ email: string }>("SELECT email FROM users WHERE id = $1", [r.user_id]);
    if (client[0]) mailStatus({ ...r, status: to }, client[0].email, to);
  }
  revalidatePath("/admin", "layout");
}

export async function adminNoteAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = toInt(form.get("id"), 1, ID_MAX);
  if (!id) return { error: "Réservation introuvable." };
  await query("UPDATE reservations SET admin_note = $1, updated_at = now() WHERE id = $2", [
    clean(form.get("admin_note"), 500),
    id,
  ]);
  revalidatePath(`/admin/reservations/${id}`);
  return { saved: true };
}

export async function toggleUserAction(form: FormData) {
  const admin = await requireAdmin();
  const id = toInt(form.get("id"), 1, ID_MAX);
  // an admin cannot lock themselves out
  if (!id || id === admin.id) return;
  await transaction(async (db) => {
    const { rows } = await db.query<{ is_active: boolean }>(
      "UPDATE users SET is_active = NOT is_active WHERE id = $1 AND role = 'client' RETURNING is_active",
      [id],
    );
    if (rows[0] && !rows[0].is_active) await db.query("DELETE FROM sessions WHERE user_id = $1", [id]);
  });
  revalidatePath("/admin/clients");
}
