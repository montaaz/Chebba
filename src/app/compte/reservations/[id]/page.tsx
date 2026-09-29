import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import CancelButton from "@/components/app/CancelButton";
import RouteSketch from "@/components/app/RouteSketch";
import StatusSteps from "@/components/app/StatusSteps";
import Icon from "@/components/Icon";
import { PANEL, StatusBadge } from "@/components/ui";
import { dateTime, dayLabel, duration, KIND_LABEL, money, STATUS_LABEL, timeLabel, until } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { reservationById } from "@/lib/server/booking";
import { query } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import { toInt } from "@/lib/validate";
import type { Status } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Ma réservation", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/compte");
  const id = toInt((await params).id, 1, 2_147_483_647);
  const r = id ? await reservationById(id) : undefined;
  // someone else's reservation looks exactly like one that does not exist
  if (!r || r.user_id !== user.id) notFound();
  const [settings, events] = await Promise.all([
    getSettings(),
    query<{ id: number; to_status: Status; created_at: Date }>(
      "SELECT id, to_status, created_at FROM reservation_events WHERE reservation_id = $1 ORDER BY id",
      [r.id],
    ),
  ]);
  const canCancel = ["pending", "confirmed"].includes(r.status) && r.start_at.getTime() > Date.now();
  const active = ["pending", "confirmed", "ongoing"].includes(r.status);

  return (
    <AppShell user={user} area="client">
      <Link prefetch={false} href="/compte" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-mist hover:text-ink">
        <Icon name="back" size={18} /> Mes trajets
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-extrabold tracking-[0.14em] text-sand">{r.reference}</p>
          <h1 className="mt-2 text-[clamp(1.5rem,4.5vw,2.2rem)] first-letter:uppercase">
            {dayLabel(r.start_at)} · {timeLabel(r.start_at)}
          </h1>
          {active && <p className="mt-1 text-sm text-aqua">{until(r.start_at)}</p>}
        </div>
        <StatusBadge status={r.status} />
      </header>

      <div className="mb-5">
        <StatusSteps status={r.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className={`${PANEL} overflow-hidden p-0!`}>
          {r.kind === "transfer" && (r.route_polyline || r.dropoff_lat) && (
            <div className="relative aspect-[5/3] border-b border-hair bg-black/20">
              <RouteSketch polyline={r.route_polyline} from={{ lat: r.pickup_lat, lng: r.pickup_lng }} to={{ lat: r.dropoff_lat, lng: r.dropoff_lng }} className="absolute inset-0 h-full w-full" />
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
                ["Service", KIND_LABEL[r.kind]],
                ["Véhicule", r.car_name],
                r.kind === "transfer" ? ["Distance", `${r.quantity.toLocaleString("fr-FR")} km`] : ["Durée", `${r.quantity} jour${r.quantity > 1 ? "s" : ""}`],
                r.kind === "transfer" ? ["Trajet", duration(r.duration_min * (r.round_trip ? 2 : 1))] : ["Passagers", String(r.passengers)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/[0.04] px-3 py-2.5">
                  <dt className="text-[0.68rem] text-fog">{k}</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {r.note && (
              <p className="mt-4 rounded-xl border border-hair p-3 text-sm text-mist">
                <span className="text-xs text-fog">Votre message · </span>
                {r.note}
              </p>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-5">
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
                  <dt>Frais et ajustements</dt>
                  <dd className="tabular-nums">{money(r.fees, r.currency)}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 flex items-end justify-between border-t border-hair pt-3">
              <span className="text-sm text-mist">Total</span>
              <span className="font-display text-3xl font-extrabold text-sand tabular-nums">{money(r.total_price, r.currency)}</span>
            </p>
            <p className="mt-2 text-xs text-fog">Prix garanti, fixé au moment de la réservation.</p>
          </section>

          <section className={PANEL}>
            <h2 className="text-base">Suivi</h2>
            <ol className="mt-4 flex flex-col gap-3">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-aqua" aria-hidden="true" />
                  <span className="flex-1">{STATUS_LABEL[e.to_status]}</span>
                  <span className="text-xs text-fog">{dateTime(e.created_at)}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className={`${PANEL} flex flex-col gap-2`}>
            <h2 className="mb-1 text-base">Besoin d&apos;aide ?</h2>
            {settings.contact_whatsapp && (
              <a className="btn btn--solid min-h-12" href={waLink(settings.contact_whatsapp, `Bonjour, j'ai une question sur ma réservation ${r.reference}.`)} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" size={18} /> Écrire sur WhatsApp
              </a>
            )}
            {settings.contact_phone && (
              <a className="btn btn--ghost min-h-12" href={`tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`}>
                <Icon name="phone" size={18} /> Appeler {settings.contact_phone}
              </a>
            )}
            {canCancel && <CancelButton id={r.id} />}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
