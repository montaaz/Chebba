import "server-only";
import { after } from "next/server";
import nodemailer, { type Transporter } from "nodemailer";
import type { PoolClient } from "pg";
import { one, query } from "./db";
import { getSettings } from "./settings";
import { dateTime, KIND_LABEL, money, STATUS_LABEL } from "../format";
import { SITE } from "../site";
import type { Reservation, Status, User } from "../types";

export type Notification = {
  id: number;
  audience: "client" | "admin";
  reservation_id: number | null;
  kind: string;
  title: string;
  body: string;
  read_at: Date | null;
  created_at: Date;
};

type Db = Pick<PoolClient, "query">;

/* ---------------- in-site notifications ---------------- */

/* Written inside the caller's transaction: a notification exists if and only if its event happened. */
export const notifyAdmins = (db: Db, n: { reservationId: number; kind: string; title: string; body: string }) =>
  db.query(
    "INSERT INTO notifications (audience, reservation_id, kind, title, body) VALUES ('admin', $1, $2, $3, $4)",
    [n.reservationId, n.kind, n.title.slice(0, 120), n.body.slice(0, 300)],
  );

export const notifyClient = (db: Db, userId: number, n: { reservationId: number; kind: string; title: string; body: string }) =>
  db.query(
    "INSERT INTO notifications (audience, user_id, reservation_id, kind, title, body) VALUES ('client', $1, $2, $3, $4, $5)",
    [userId, n.reservationId, n.kind, n.title.slice(0, 120), n.body.slice(0, 300)],
  );

/* an admin has two inboxes: the team's and, as a client of the site, their own */
const scope = (user: User, box: "client" | "admin") =>
  box === "admin" ? { where: "audience = 'admin'", params: [] as unknown[] } : { where: "audience = 'client' AND user_id = $1", params: [user.id] };

export const boxOf = (user: User, asked?: string): "client" | "admin" =>
  user.role === "admin" && asked !== "client" ? "admin" : "client";

export async function unreadCount(user: User) {
  const s = scope(user, boxOf(user));
  const row = await one<{ n: number }>(`SELECT count(*)::int AS n FROM notifications WHERE ${s.where} AND read_at IS NULL`, s.params);
  return row?.n ?? 0;
}

export async function listNotifications(user: User, box: "client" | "admin", before?: number, pageSize = 30) {
  const s = scope(user, box);
  const params = [...s.params];
  const cursor = before ? ` AND id < $${params.push(before)}` : "";
  const rows = await query<Notification>(
    `SELECT id, audience, reservation_id, kind, title, body, read_at, created_at
       FROM notifications WHERE ${s.where}${cursor} ORDER BY id DESC LIMIT $${params.push(pageSize + 1)}`,
    params,
  );
  return { rows: rows.slice(0, pageSize), next: rows.length > pageSize ? rows[pageSize - 1].id : null };
}

export async function markRead(user: User, box: "client" | "admin", upToId: number) {
  const s = scope(user, box);
  const params = [...s.params];
  await query(`UPDATE notifications SET read_at = now() WHERE ${s.where} AND read_at IS NULL AND id <= $${params.push(upToId)}`, params);
  // opportunistic clean-up: read notifications older than 90 days are of no use to anyone
  if (Math.random() < 0.02) await query("DELETE FROM notifications WHERE read_at IS NOT NULL AND created_at < now() - interval '90 days'");
}

/* ---------------- e-mail ---------------- */

const globalForMail = globalThis as unknown as { __chebbaMail?: Transporter | null };

/* a few reused connections instead of a new handshake per message, and hard time limits */
function pooled(url: string) {
  const u = new URL(url);
  for (const [k, v] of Object.entries({ pool: "true", maxConnections: "3", connectionTimeout: "8000", socketTimeout: "12000" }))
    if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  return u.toString();
}

function transport(): Transporter | null {
  if (globalForMail.__chebbaMail !== undefined) return globalForMail.__chebbaMail;
  const url = process.env.SMTP_URL?.trim();
  globalForMail.__chebbaMail = url ? nodemailer.createTransport(pooled(url)) : null;
  if (!url) console.info("[mail] SMTP_URL is not set — e-mail notifications are off");
  return globalForMail.__chebbaMail;
}

export const mailEnabled = () => transport() !== null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Mail = { to: string; subject: string; intro: string; rows: [string, string][]; action?: { label: string; path: string } };

function render(m: Mail) {
  const brand = `${SITE.brand} ${SITE.brandSub}`;
  const link = m.action ? `${SITE.url.replace(/\/$/, "")}${m.action.path}` : "";
  const text = [m.intro, "", ...m.rows.map(([k, v]) => `${k} : ${v}`), ...(m.action ? ["", `${m.action.label} : ${link}`] : []), "", brand].join("\n");
  // table layout and inline styles: the only thing every mail app renders the same way
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#021a1c;font-family:Arial,Helvetica,sans-serif;color:#f2f8f7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#021a1c"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#03282b;border:1px solid #0d4a4d;border-radius:18px">
<tr><td style="padding:24px 24px 8px;font-size:13px;letter-spacing:4px;font-weight:bold;color:#86cfcf">${esc(brand.toUpperCase())}</td></tr>
<tr><td style="padding:8px 24px 16px;font-size:16px;line-height:24px">${esc(m.intro)}</td></tr>
<tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #0d4a4d">
${m.rows.map(([k, v]) => `<tr><td style="padding:10px 0;font-size:13px;color:#a9c6c5;vertical-align:top;width:38%">${esc(k)}</td><td style="padding:10px 0;font-size:14px;color:#f2f8f7">${esc(v)}</td></tr>`).join("")}
</table></td></tr>
${m.action ? `<tr><td style="padding:20px 24px 8px"><a href="${esc(link)}" style="display:inline-block;background:#4c9c9d;color:#02211f;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 26px;border-radius:100px">${esc(m.action.label)}</a></td></tr>` : ""}
<tr><td style="padding:16px 24px 24px;font-size:12px;color:#6f9394">Message automatique — merci de ne pas y répondre.</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

/* Sent after the response has gone out: a slow or broken mail server never delays or fails a booking. */
function sendLater(mails: (Mail | null)[]) {
  const t = transport();
  const list = mails.filter((m): m is Mail => Boolean(m?.to));
  if (!t || !list.length) return;
  after(async () => {
    for (const m of list) {
      try {
        await t.sendMail({ from: process.env.MAIL_FROM || `${SITE.brand} ${SITE.brandSub} <no-reply@localhost>`, to: m.to, subject: m.subject, ...render(m) });
      } catch (err) {
        console.error(`[mail] "${m.subject}" to ${m.to} failed:`, (err as Error).message);
      }
    }
  });
}

const details = (r: Reservation): [string, string][] => [
  ["Référence", r.reference],
  ["Type", KIND_LABEL[r.kind]],
  ["Véhicule", r.car_name],
  ["Départ", `${dateTime(r.start_at)} — ${r.pickup_label}`],
  ...(r.kind === "transfer"
    ? ([["Destination", `${r.dropoff_label}${r.round_trip ? " (aller-retour)" : ""}`], ["Distance", `${r.quantity.toLocaleString("fr-FR")} km`]] as [string, string][])
    : ([["Retour", dateTime(r.end_at)]] as [string, string][])),
  ["Montant", money(r.total_price, r.currency)],
];

const CLIENT_LINE: Record<Status, string> = {
  pending: "Nous avons bien reçu votre demande. Nous vous confirmons la disponibilité très vite.",
  confirmed: "Bonne nouvelle : votre réservation est confirmée.",
  ongoing: "Votre réservation a commencé. Bonne route !",
  completed: "Votre réservation est terminée. Merci de votre confiance, à très bientôt.",
  cancelled: "Votre réservation a été annulée. Contactez-nous pour toute question.",
};

export const clientTitle = (to: Status) =>
  ({ pending: "Demande reçue", confirmed: "Réservation confirmée", ongoing: "Réservation en cours", completed: "Réservation terminée", cancelled: "Réservation annulée" })[to];

export const clientBody = (to: Status) => CLIENT_LINE[to];

/* ---------------- events ---------------- */

export async function mailCreated(r: Reservation, clientEmail: string) {
  const s = await getSettings();
  sendLater([
    { to: clientEmail, subject: `Demande reçue — ${r.reference}`, intro: `Bonjour ${r.customer_name.split(" ")[0]}, ${CLIENT_LINE.pending.toLowerCase()}`, rows: details(r), action: { label: "Suivre ma réservation", path: "/compte" } },
    s.contact_email
      ? { to: s.contact_email, subject: `Nouvelle demande — ${r.reference}`, intro: `${r.customer_name} (${r.customer_phone}) vient de faire une demande.`, rows: details(r), action: { label: "Ouvrir la réservation", path: `/admin/reservations/${r.id}` } }
      : null,
  ]);
}

export function mailStatus(r: Reservation, clientEmail: string, to: Status) {
  sendLater([
    { to: clientEmail, subject: `${clientTitle(to)} — ${r.reference}`, intro: `Bonjour ${r.customer_name.split(" ")[0]}, ${CLIENT_LINE[to].charAt(0).toLowerCase()}${CLIENT_LINE[to].slice(1)}`, rows: [...details(r), ["Statut", STATUS_LABEL[to]]], action: { label: "Voir ma réservation", path: "/compte" } },
  ]);
}

export async function mailCancelledByClient(r: Reservation) {
  const s = await getSettings();
  if (!s.contact_email) return;
  sendLater([{ to: s.contact_email, subject: `Annulation client — ${r.reference}`, intro: `${r.customer_name} (${r.customer_phone}) a annulé sa réservation.`, rows: details(r), action: { label: "Ouvrir la réservation", path: `/admin/reservations/${r.id}` } }]);
}
