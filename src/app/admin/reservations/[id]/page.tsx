import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setStatusAction } from "@/app/actions/admin";
import Avatar from "@/components/app/Avatar";
import RouteSketch from "@/components/app/RouteSketch";
import StatusSteps from "@/components/app/StatusSteps";
import NoteForm from "@/components/admin/NoteForm";
import Icon from "@/components/Icon";
import { PANEL, StatusBadge } from "@/components/ui";
import { dateTime, dayLabel, duration, KIND_LABEL, money, NEXT_STATUS, STATUS_LABEL, timeLabel, until } from "@/lib/format";
import { reservationById } from "@/lib/server/booking";
import { query } from "@/lib/server/db";
import { SITE } from "@/lib/site";
import { toInt } from "@/lib/validate";
import type { Status } from "@/lib/types";
import { messageToClient, waLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Réservation" };

type Event = { id: number; from_status: Status | null; to_status: Status; note: string; created_at: Date; actor: string | null };

const ACTION: Record<Status, { label: string; icon: string }> = {
  pending: { label: "Remettre en attente", icon: "clock" },
  confirmed: { label: "Confirmer", icon: "check" },
  ongoing: { label: "Démarrer", icon: "arrow" },
  completed: { label: "Terminer", icon: "check" },
  cancelled: { label: "Annuler", icon: "close" },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = toInt((await params).id, 1, 2_147_483_647);
  if (!id) notFound();
  const r = await reservationById(id);
  if (!r) notFound();
  const [events, client] = await Promise.all([
    query<Event>(
      `SELECT e.id, e.from_status, e.to_status, e.note, e.created_at, u.full_name AS actor
         FROM reservation_events e LEFT JOIN users u ON u.id = e.actor_id
        WHERE e.reservation_id = $1 ORDER BY e.id`,
      [id],
    ),
    query<{ email: string; n: number; spent: number }>(
      `SELECT u.email,
              (SELECT count(*)::int FROM reservations WHERE user_id = u.id) AS n,
              (SELECT coalesce(sum(total_price), 0)::float FROM reservations WHERE user_id = u.id AND status = 'completed') AS spent
         FROM users u WHERE u.id = $1`,
      [r.user_id],
    ),
  ]);
  const c = client[0];
  const tel = r.customer_phone.replace(/[^\d+]/g, "");
  const next = NEXT_STATUS[r.status];
  const active = ["pending", "confirmed", "ongoing"].includes(r.status);
  const map =
    r.pickup_lat && r.dropoff_lat
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${r.pickup_lat},${r.pickup_lng};${r.dropoff_lat},${r.dropoff_lng}`
      : null;

  const actions = (bar: boolean) =>
    next.map((s) => (
      <form key={s} action={setStatusAction} className={bar ? "flex-1" : ""}>
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="status" value={s} />
        <button type="submit" className={`btn min-h-12 w-full ${s === "cancelled" ? "btn--ghost text-[#f5b39a]" : "btn--solid"}`}>
          <Icon name={ACTION[s].icon} size={18} /> {ACTION[s].label}
        </button>
      </form>
    ));

  return (
    <>
      <Link prefetch={false} href="/admin/reservations" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-mist hover:text-ink">
        <Icon name="back" size={18} /> Réservations
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-sm font-extrabold tracking-[0.14em] text-sand">{r.reference}</p>
            <StatusBadge status={r.status} />
          </div>
          <h1 className="mt-2 text-[clamp(1.5rem,4.5vw,2.2rem)] first-letter:uppercase">
            {dayLabel(r.start_at)} · {timeLabel(r.start_at)}
          </h1>
          <p className="mt-1 text-sm text-mist">
            {KIND_LABEL[r.kind]} · {r.car_name}
            {active && <span className="text-aqua"> · {until(r.start_at)}</span>}
          </p>
        </div>
        {next.length > 0 && <div className="flex gap-2 max-lg:hidden">{actions(false)}</div>}
      </header>

      <div className="mb-5">
        <StatusSteps status={r.status} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <section className={`${PANEL} overflow-hidden p-0!`}>
            {r.kind === "transfer" && (r.route_polyline || r.dropoff_lat) && (
              <div className="relative aspect-[5/3] border-b border-hair bg-black/20 sm:aspect-[2/1]">
                <RouteSketch polyline={r.route_polyline} from={{ lat: r.pickup_lat, lng: r.pickup_lng }} to={{ lat: r.dropoff_lat, lng: r.dropoff_lng }} className="absolute inset-0 h-full w-full" />
                {map && (
                  <a href={map} target="_blank" rel="noopener noreferrer" className="absolute right-3 bottom-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-night/85 px-4 text-xs font-semibold backdrop-blur hover:text-aqua">
                    Ouvrir la carte <Icon name="external" size={14} />
                  </a>
                )}
              </div>
            )}
            <div className="p-5 sm:p-6">
              <ol className="relative flex flex-col gap-4 pl-7 before:absolute before:top-2.5 before:bottom-2.5 before:left-[9px] before:w-0.5 before:bg-line">
                <li className="relative">
                  <span className="absolute top-0.5 -left-7 grid size-5 place-items-center rounded-full bg-aqua text-[0.6rem] font-bold text-[#02211f]">A</span>
                  <p className="font-semibold">{r.pickup_label}</p>
                  <p className="text-xs text-fog">{dateTime(r.start_at)}</p>
                </li>
                <li className="relative">
                  <span className="absolute top-0.5 -left-7 grid size-5 place-items-center rounded-full bg-sand text-[0.6rem] font-bold text-[#02211f]">B</span>
                  <p className="font-semibold">{r.kind === "rental" ? "Retour du véhicule" : r.dropoff_label}</p>
                  <p className="text-xs text-fog">{r.kind === "rental" ? dateTime(r.end_at) : r.round_trip ? "Aller-retour" : "Aller simple"}</p>
                </li>
              </ol>
              <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  r.kind === "transfer" ? ["Distance", `${r.quantity.toLocaleString("fr-FR")} km`] : ["Durée", `${r.quantity} jour(s)`],
                  r.kind === "transfer" ? ["Trajet", duration(r.duration_min * (r.round_trip ? 2 : 1))] : ["Retour", timeLabel(r.end_at)],
                  ["Passagers", String(r.passengers)],
                  ["Véhicule", r.car_name],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.04] px-3 py-2.5">
                    <dt className="text-[0.68rem] text-fog">{k}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {r.note && (
                <p className="mt-4 rounded-xl border border-line bg-aqua/5 p-4 text-sm">
                  <span className="mb-1 block text-xs font-semibold text-aqua">Message du client</span>
                  {r.note}
                </p>
              )}
            </div>
          </section>

          <section className={PANEL}>
            <h2 className="text-base">Historique</h2>
            <ol className="relative mt-4 flex flex-col gap-4 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-line">
              {events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute top-1.5 -left-6 size-[11px] rounded-full border-2 border-night-2 bg-aqua" aria-hidden="true" />
                  <p>
                    {e.from_status ? <span className="text-mist">{STATUS_LABEL[e.from_status]} → </span> : null}
                    <b>{STATUS_LABEL[e.to_status]}</b>
                  </p>
                  <p className="text-xs text-fog">
                    {dateTime(e.created_at)} · {e.actor ?? "Système"}
                    {e.note ? ` — ${e.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className={PANEL}>
            <div className="flex items-center gap-3">
              <Avatar name={r.customer_name} size={48} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.customer_name}</p>
                <p className="truncate text-sm text-mist">{c?.email}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/[0.04] py-2.5">
                <dt className="text-[0.68rem] text-fog">Réservations</dt>
                <dd className="font-semibold tabular-nums">{c?.n ?? 1}</dd>
              </div>
              <div className="rounded-xl bg-white/[0.04] py-2.5">
                <dt className="text-[0.68rem] text-fog">Dépensé</dt>
                <dd className="font-semibold tabular-nums">{money(c?.spent ?? 0, r.currency)}</dd>
              </div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a className="btn btn--ghost min-h-12" href={`tel:${tel}`}>
                <Icon name="phone" size={18} /> Appeler
              </a>
              <a className="btn btn--solid min-h-12" href={waLink(r.customer_phone, messageToClient(r, `${SITE.brand} ${SITE.brandSub}`))} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" size={18} /> WhatsApp
              </a>
            </div>
            <p className="mt-2 text-xs text-fog">{r.customer_phone} · le message WhatsApp est rédigé selon le statut.</p>
          </section>

          <section className={PANEL}>
            <h2 className="text-base">Montant</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm text-mist">
              <div className="flex justify-between gap-3">
                <dt>
                  {r.quantity.toLocaleString("fr-FR")} {r.kind === "transfer" ? "km" : "jour(s)"} × {money(r.unit_price, r.currency)}
                </dt>
                <dd className="tabular-nums">{money(Math.round(r.quantity * r.unit_price * 1000) / 1000, r.currency)}</dd>
              </div>
              {r.fees !== 0 && (
                <div className="flex justify-between gap-3">
                  <dt>Frais, majorations et remises</dt>
                  <dd className="tabular-nums">{money(r.fees, r.currency)}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 flex items-end justify-between border-t border-hair pt-3">
              <span className="text-sm text-mist">Total</span>
              <span className="font-display text-3xl font-extrabold text-sand tabular-nums">{money(r.total_price, r.currency)}</span>
            </p>
            <p className="mt-2 text-xs text-fog">Tarif figé au moment de la réservation · créée le {dateTime(r.created_at)}</p>
          </section>

          <section className={PANEL}>
            <h2 className="mb-3 text-base">Note interne</h2>
            <NoteForm id={r.id} note={r.admin_note} />
          </section>
        </div>
      </div>

      {/* phones & tablets: the next step is always under the thumb */}
      {next.length > 0 && (
        <>
          <div className="h-20 lg:hidden" aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex gap-2 border-t border-line bg-night/95 px-(--pad) py-3 backdrop-blur-xl lg:hidden">
            {actions(true)}
          </div>
        </>
      )}
    </>
  );
}
