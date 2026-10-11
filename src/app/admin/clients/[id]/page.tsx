import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleUserAction } from "@/app/actions/admin";
import Avatar from "@/components/app/Avatar";
import TripRow from "@/components/app/TripRow";
import ResetPassword from "@/components/admin/ResetPassword";
import Icon from "@/components/Icon";
import { PANEL } from "@/components/ui";
import { dateOnly, dateTime, money } from "@/lib/format";
import { one, query } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import { SITE } from "@/lib/site";
import { toInt } from "@/lib/validate";
import { waLink } from "@/lib/whatsapp";
import type { Reservation } from "@/lib/types";

export const metadata: Metadata = { title: "Fiche client" };

type Client = { id: number; full_name: string; email: string; phone: string; is_active: boolean; created_at: Date; last_login_at: Date | null };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = toInt((await params).id, 1, 2_147_483_647);
  if (!id) notFound();
  const [c, rows, settings] = await Promise.all([
    one<Client>("SELECT id, full_name, email, phone, is_active, created_at, last_login_at FROM users WHERE id = $1 AND role = 'client'", [id]),
    query<Reservation & { docs: number }>(
      `SELECT r.*, concat_ws(' ', c.make, c.model, nullif(c.trim_level, '')) AS car_name,
              (SELECT count(*)::int FROM reservation_documents d WHERE d.reservation_id = r.id) AS docs
         FROM reservations r JOIN cars c ON c.id = r.car_id
        WHERE r.user_id = $1 ORDER BY r.start_at DESC`,
      [id],
    ),
    getSettings(),
  ]);
  if (!c) notFound();
  const done = rows.filter((r) => r.status === "completed");
  const spent = done.reduce((t, r) => t + r.total_price, 0);
  const km = done.filter((r) => r.kind === "transfer").reduce((t, r) => t + r.quantity, 0);
  const docs = rows.reduce((t, r) => t + r.docs, 0);
  const tel = c.phone.replace(/[^\d+]/g, "");

  return (
    <>
      <Link prefetch={false} href="/admin/clients" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-mist hover:text-ink">
        <Icon name="back" size={18} /> Clients
      </Link>

      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={c.full_name} size={64} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Fiche client</p>
          <h1 className="mt-1 text-[clamp(1.5rem,4vw,2.2rem)]">{c.full_name}</h1>
          <p className="mt-1 text-sm text-mist">
            Client depuis le {dateOnly(c.created_at)}
            {!c.is_active && <span className="ml-2 rounded-full border border-coral/40 px-2 py-0.5 text-xs text-[#f5b39a]">✕ Bloqué</span>}
          </p>
        </div>
      </header>

      <dl className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {[
          ["Réservations", String(rows.length)],
          ["Terminées", String(done.length)],
          ["Dépensé", money(spent, settings.currency)],
          ["Km parcourus", `${Math.round(km).toLocaleString("fr-FR")}`],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-2xl border border-hair bg-white/[0.03] p-4">
            <dt className="text-xs text-mist">{k}</dt>
            <dd className="mt-1 font-display text-[clamp(1.05rem,4.6vw,1.6rem)] font-extrabold break-words tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Historique">
          <h2 className="mb-3 text-base">
            Historique <span className="text-sm font-normal text-mist">· {rows.length} réservation{rows.length > 1 ? "s" : ""} · {docs} document{docs > 1 ? "s" : ""}</span>
          </h2>
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mist">Aucune réservation pour le moment.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {rows.map((r) => (
                <li key={r.id}>
                  <TripRow
                    r={r}
                    href={`/admin/reservations/${r.id}#documents`}
                    who={
                      <span className={`mb-1 inline-flex items-center gap-1 text-xs ${r.docs ? "text-aqua" : "text-fog"}`}>
                        📎 {r.docs ? `${r.docs} document${r.docs > 1 ? "s" : ""}` : "Aucun contrat"}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <section className={PANEL}>
            <h2 className="mb-3 text-base">Coordonnées</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-mist">E-mail (identifiant)</dt>
                <dd className="text-right font-semibold break-all">{c.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mist">Téléphone</dt>
                <dd className="font-semibold">{c.phone}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mist">Dernière connexion</dt>
                <dd>{c.last_login_at ? dateTime(c.last_login_at) : "Jamais"}</dd>
              </div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a className="btn btn--ghost min-h-11" href={`tel:${tel}`}>
                <Icon name="phone" size={18} /> Appeler
              </a>
              <a className="btn btn--solid min-h-11" href={waLink(c.phone, `Bonjour ${c.full_name.split(" ")[0]}, `)} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" size={18} /> WhatsApp
              </a>
            </div>
          </section>

          <section className={PANEL}>
            <h2 className="mb-3 text-base">Accès au compte</h2>
            <ResetPassword userId={c.id} site={SITE.url} />
          </section>

          <section className={PANEL}>
            <h2 className="mb-2 text-base">Compte</h2>
            <form action={toggleUserAction}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className={`btn min-h-11 w-full ${c.is_active ? "btn--ghost text-[#f5b39a]" : "btn--solid"}`}>
                {c.is_active ? "Bloquer ce client" : "Débloquer ce client"}
              </button>
            </form>
            <p className="mt-2 text-xs text-fog">Un client bloqué ne peut plus se connecter ni réserver.</p>
          </section>
        </div>
      </div>
    </>
  );
}
