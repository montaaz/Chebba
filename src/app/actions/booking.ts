"use server";

import { revalidatePath } from "next/cache";
import { endSession, getUser, hashPassword, requireUser, startSession, verifyPassword } from "@/lib/server/auth";
import { BookingError, createReservation, reservationById } from "@/lib/server/booking";
import { one, query, transaction } from "@/lib/server/db";
import { mailCancelledByClient, notifyAdmins } from "@/lib/server/notify";
import { dateTime } from "@/lib/format";
import { clean, isEmail, isName, isPassword, isPhone, toInt } from "@/lib/validate";
import { randomBytes } from "node:crypto";
import type { User } from "@/lib/types";
import { signIn, signUp } from "./auth";

export type BookingResult =
  | { ok: true; id: number; reference: string; total: number; currency: string; forClient?: string }
  | { ok: false; error: string };

type Account = { mode?: unknown; name?: unknown; email?: unknown; phone?: unknown; password?: unknown };

/* Last step of the flow: signs the visitor up (or in) and books, in one request. */
export async function bookAction(raw: Record<string, unknown>, account?: Account): Promise<BookingResult> {
  try {
    let user = await getUser();
    if (!user) {
      const email = clean(account?.email, 160);
      const error =
        account?.mode === "login"
          ? await signIn(email, account.password)
          : await signUp({
              name: clean(account?.name, 80),
              email,
              phone: clean(account?.phone, 24),
              password: account?.password,
            });
      if (error) return { ok: false, error };
      const fresh = await query<{ id: number; role: "client" | "admin"; full_name: string; email: string; phone: string }>(
        "SELECT id, role, full_name, email, phone FROM users WHERE lower(email) = lower($1) AND is_active",
        [email],
      );
      user = fresh[0] ?? null;
      if (!user) return { ok: false, error: "Connexion impossible." };
    }

    const name = clean(raw.customerName, 80);
    const phone = clean(raw.customerPhone, 24);
    if (name && !isName(name)) return { ok: false, error: "Indiquez le nom du passager." };
    if (phone && !isPhone(phone)) return { ok: false, error: "Indiquez un numéro de téléphone valide." };

    // the agency books for a client: the reservation belongs to the client, never to the admin
    if (user.role === "admin") {
      if (!isName(name)) return { ok: false, error: "Indiquez le nom du client." };
      if (!isPhone(phone)) return { ok: false, error: "Indiquez le téléphone du client." };
      const email = clean(account?.email, 160).toLowerCase();
      if (email && !isEmail(email)) return { ok: false, error: "L'e-mail du client est invalide." };
      const client = await clientFor(name, phone, email);
      if ("error" in client) return { ok: false, error: client.error };
      const done = await createReservation(client, raw);
      revalidatePath("/admin", "layout");
      return { ok: true, ...done, forClient: client.full_name };
    }

    const done = await createReservation(user, raw);
    revalidatePath("/compte");
    return { ok: true, ...done };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    console.error("booking failed", err);
    return { ok: false, error: "Une erreur est survenue. Réessayez ou appelez-nous." };
  }
}

/* The client an admin is booking for: found by e-mail, else by phone number, else created.
   A new account gets a random password; the admin can send real access from the client sheet. */
async function clientFor(name: string, phone: string, email: string): Promise<User | { error: string }> {
  const digits = phone.replace(/\D/g, "").slice(-8);
  const cols = "id, role, full_name, email, phone";
  const found =
    (email ? await one<User>(`SELECT ${cols} FROM users WHERE lower(email) = $1`, [email]) : null) ??
    (await one<User>(
      `SELECT ${cols} FROM users WHERE role = 'client' AND right(regexp_replace(phone, '\\D', '', 'g'), 8) = $1 ORDER BY id DESC LIMIT 1`,
      [digits],
    ));
  if (found) return found.role === "client" ? found : { error: "Cet e-mail appartient à un compte de l'équipe." };
  // no e-mail given: a unique placeholder keeps the account valid (it receives nothing)
  const address = email || `tel-${phone.replace(/\D/g, "")}-${randomBytes(3).toString("hex")}@sans-email.chebbautocar.com`;
  const created = await one<User>(
    `INSERT INTO users (full_name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING ${cols}`,
    [name, address, phone, await hashPassword(randomBytes(18).toString("base64url"))],
  );
  return created!;
}

export async function cancelAction(form: FormData) {
  const user = await requireUser();
  const id = toInt(form.get("id"), 1, 2_147_483_647);
  if (!id) return;
  const r = await reservationById(id);
  // a client may only cancel their own reservation, and only before it starts
  if (!r || r.user_id !== user.id) return;
  if (!["pending", "confirmed"].includes(r.status) || r.start_at.getTime() < Date.now()) return;

  await transaction(async (db) => {
    const { rowCount } = await db.query(
      "UPDATE reservations SET status = 'cancelled', updated_at = now() WHERE id = $1 AND status = $2",
      [id, r.status],
    );
    if (rowCount)
      await db.query(
        "INSERT INTO reservation_events (reservation_id, actor_id, from_status, to_status, note) VALUES ($1, $2, $3, 'cancelled', 'Annulée par le client')",
        [id, user.id, r.status],
      );
    if (rowCount)
      await notifyAdmins(db, {
        reservationId: id,
        kind: "cancelled",
        title: "Annulation par le client",
        body: `${r.customer_name} · ${r.reference} · départ prévu le ${dateTime(r.start_at)}`,
      });
  });
  await mailCancelledByClient(r).catch((e) => console.error("[mail]", e));
  revalidatePath("/compte", "layout");
}

export type ProfileState = { error?: string; saved?: boolean };

export async function profileAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const name = clean(form.get("name"), 80);
  const phone = clean(form.get("phone"), 24);
  if (!isName(name)) return { error: "Indiquez votre nom complet." };
  if (!isPhone(phone)) return { error: "Indiquez un numéro de téléphone valide." };
  await query("UPDATE users SET full_name = $1, phone = $2 WHERE id = $3", [name, phone, user.id]);
  revalidatePath("/compte", "layout");
  return { saved: true };
}

export async function passwordAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const current = form.get("current"), next = form.get("next"), again = form.get("again");
  if (!isPassword(next)) return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  if (next !== again) return { error: "Les deux nouveaux mots de passe ne correspondent pas." };
  const row = await one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!row || typeof current !== "string" || current.length > 200 || !(await verifyPassword(current, row.password_hash)))
    return { error: "Le mot de passe actuel est incorrect." };
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(next), user.id]);
  // every other device is signed out; this one gets a fresh session
  await endSession();
  await query("DELETE FROM sessions WHERE user_id = $1", [user.id]);
  await startSession(user.id);
  return { saved: true };
}
