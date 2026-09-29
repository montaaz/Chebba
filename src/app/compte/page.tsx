import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import RouteSketch from "@/components/app/RouteSketch";
import StatusSteps from "@/components/app/StatusSteps";
import TripRow from "@/components/app/TripRow";
import Icon from "@/components/Icon";
import Picture from "@/components/Picture";
import { StatusBadge } from "@/components/ui";
import { dayLabel, duration, KIND_LABEL, money, timeLabel, until } from "@/lib/format";
import manifest from "@/lib/images.json";
import { requireUser } from "@/lib/server/auth";
import { reservationsOf } from "@/lib/server/booking";
import { getActiveCars, getSettings } from "@/lib/server/settings";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Mes trajets", robots: { index: false } };

const ACTIVE = ["pending", "confirmed", "ongoing"];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser("/compte");
  const [list, settings, cars, { tab }] = await Promise.all([reservationsOf(user.id, 100), getSettings(), getActiveCars(), searchParams]);
  const now = Date.now();
  const upcoming = list
    .filter((r) => ACTIVE.includes(r.status) && r.end_at.getTime() >= now)
    .sort((a, b) => a.start_at.getTime() - b.start_at.getTime());
  const history = list.filter((r) => !upcoming.includes(r)).sort((a, b) => b.start_at.getTime() - a.start_at.getTime());
  const next = upcoming[0];
  const done = list.filter((r) => r.status === "completed");
  const spent = done.reduce((t, r) => t + r.total_price, 0);
  const km = done.filter((r) => r.kind === "transfer").reduce((t, r) => t + r.quantity, 0);
  const showHistory = tab === "historique";
  const rows = showHistory ? history : upcoming.slice(next ? 1 : 0);
  const image = next ? cars.find((c) => c.id === next.car_id)?.image : undefined;
  const hasImage = image && image in manifest;

  return (
    <AppShell user={user} area="client">
      <PageHeader
        eyebrow="Espace client"
        title={`Bonjour, ${user.full_name.split(" ")[0]}.`}
        sub={upcoming.length ? `${upcoming.length} trajet${upcoming.length > 1 ? "s" : ""} à venir` : "Aucun trajet prévu pour le moment."}
      >
        <Link prefetch={false} className="btn btn--solid min-h-12" href="/reserver">
          <Icon name="plus" size={18} /> Nouvelle réservation
        </Link>
      </PageHeader>

      {/* ---------------- next trip ---------------- */}
      {next ? (
        <section className="relative overflow-hidden rounded-[28px] border border-line bg-linear-to-br from-deep via-[#03363a] to-night-2" aria-labelledby="next-title">
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="flex flex-col gap-5 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="eyebrow" id="next-title">
                  Prochain trajet
                </p>
                <StatusBadge status={next.status} />
              </div>
              <div>
                <p className="font-display text-[clamp(1.6rem,5vw,2.4rem)] leading-none font-extrabold first-letter:uppercase">
                  {dayLabel(next.start_at)}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-mist">
                  <span className="inline-flex items-center gap-1.5 text-lg font-semibold text-ink">
                    <Icon name="clock" size={18} /> {timeLabel(next.start_at)}
                  </span>
                  <span className="rounded-full bg-aqua/15 px-2.5 py-0.5 text-sm font-semibold text-aqua">{until(next.start_at)}</span>
                </p>
              </div>
              <ol className="relative flex flex-col gap-3 pl-7 before:absolute before:top-2.5 before:bottom-2.5 before:left-[9px] before:w-0.5 before:bg-line">
                <li className="relative">
                  <span className="absolute top-0.5 -left-7 grid size-5 place-items-center rounded-full bg-aqua text-[0.6rem] font-bold text-[#02211f]">A</span>
                  <p className="font-semibold">{next.pickup_label}</p>
                </li>
                <li className="relative">
                  <span className="absolute top-0.5 -left-7 grid size-5 place-items-center rounded-full bg-sand text-[0.6rem] font-bold text-[#02211f]">B</span>
                  <p className="font-semibold">{next.kind === "rental" ? `Retour le ${dayLabel(next.end_at)} à ${timeLabel(next.end_at)}` : next.dropoff_label}</p>
                </li>
              </ol>
              <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-black/20 p-3 text-center">
                <div>
                  <dt className="text-[0.68rem] text-fog">{next.kind === "transfer" ? "Distance" : "Durée"}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {next.kind === "transfer" ? `${Math.round(next.quantity)} km` : `${next.quantity} j`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.68rem] text-fog">{next.kind === "transfer" ? "Trajet" : "Type"}</dt>
                  <dd className="mt-0.5 font-semibold">{next.kind === "transfer" ? duration(next.duration_min * (next.round_trip ? 2 : 1)) : KIND_LABEL[next.kind]}</dd>
                </div>
                <div>
                  <dt className="text-[0.68rem] text-fog">Montant</dt>
                  <dd className="mt-0.5 font-display font-extrabold text-sand tabular-nums">{money(next.total_price, next.currency)}</dd>
                </div>
              </dl>
              <StatusSteps status={next.status} />
              <div className="flex flex-wrap gap-2">
                <Link prefetch={false} href={`/compte/reservations/${next.id}`} className="btn btn--solid min-h-12 max-sm:flex-1">
                  Détails <Icon name="arrow" size={18} />
                </Link>
                {settings.contact_whatsapp && (
                  <a
                    className="btn btn--ghost min-h-12 max-sm:flex-1"
                    href={waLink(settings.contact_whatsapp, `Bonjour, j'ai une question sur ma réservation ${next.reference}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="chat" size={18} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div className="relative min-h-52 border-t border-line bg-black/20 lg:border-t-0 lg:border-l">
              {next.kind === "transfer" && (next.route_polyline || next.dropoff_lat) ? (
                <RouteSketch
                  polyline={next.route_polyline}
                  from={{ lat: next.pickup_lat, lng: next.pickup_lng }}
                  to={{ lat: next.dropoff_lat, lng: next.dropoff_lng }}
                  className="absolute inset-0 h-full w-full"
                />
              ) : hasImage ? (
                <div className="absolute inset-0 grid place-items-center p-6">
                  <Picture name={image} alt={next.car_name} sizes="(max-width: 1023px) 90vw, 40vw" className="max-h-full w-full object-contain" />
                </div>
              ) : null}
              <p className="absolute bottom-3 left-4 flex items-center gap-2 rounded-full bg-night/80 px-3 py-1.5 text-xs text-mist backdrop-blur">
                <Icon name="car" size={15} /> {next.car_name}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid place-items-center gap-4 rounded-[28px] border border-dashed border-line bg-white/[0.02] px-6 py-12 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-aqua/12 text-aqua">
            <Icon name="route" size={28} />
          </span>
          <div>
            <h2 className="text-xl">Où allons-nous ?</h2>
            <p className="mt-2 max-w-sm text-sm text-mist">Indiquez votre trajet : le prix s&apos;affiche immédiatement, au kilomètre près.</p>
          </div>
          <Link prefetch={false} href="/reserver" className="btn btn--solid min-h-12">
            Calculer mon trajet <Icon name="arrow" size={18} />
          </Link>
        </section>
      )}

      {/* ---------------- figures ---------------- */}
      <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {[
          ["À venir", String(upcoming.length), "calendar"],
          ["Terminés", String(done.length), "check"],
          ["Km parcourus", `${Math.round(km).toLocaleString("fr-FR")}`, "road"],
          ["Dépensé", money(spent, settings.currency), "wallet"],
        ].map(([label, value, icon]) => (
          <div key={label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-hair bg-white/[0.03] p-3.5 sm:p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-aqua/10 text-aqua">
              <Icon name={icon} size={19} />
            </span>
            <div className="min-w-0">
              <dt className="truncate text-xs text-mist">{label}</dt>
              <dd className="font-display text-[clamp(1rem,4.4vw,1.35rem)] font-extrabold break-words tabular-nums">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {/* ---------------- lists ---------------- */}
      <section className="mt-8" aria-label="Mes réservations">
        <nav className="flex gap-1.5 rounded-full border border-hair bg-white/[0.02] p-1 sm:inline-flex" aria-label="Filtre">
          {[
            ["", `À venir${upcoming.length > (next ? 1 : 0) ? ` (${upcoming.length - (next ? 1 : 0)})` : ""}`],
            ["historique", `Historique (${history.length})`],
          ].map(([k, label]) => (
            <Link
              prefetch={false}
              key={k}
              href={k ? `/compte?tab=${k}` : "/compte"}
              aria-current={(k === "historique") === showHistory ? "page" : undefined}
              className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-5 text-sm font-semibold sm:flex-none ${(k === "historique") === showHistory ? "bg-white/10 text-ink" : "text-mist hover:text-ink"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {rows.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mist">
            {showHistory ? "Vos trajets passés apparaîtront ici." : next ? "Pas d'autre trajet prévu." : "Aucun trajet prévu."}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2.5">
            {rows.map((r) => (
              <li key={r.id}>
                <TripRow r={r} href={`/compte/reservations/${r.id}`} />
              </li>
            ))}
          </ul>
        )}
      </section>

    </AppShell>
  );
}
