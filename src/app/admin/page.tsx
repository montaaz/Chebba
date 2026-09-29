import Link from "next/link";
import Avatar from "@/components/app/Avatar";
import PageHeader from "@/components/app/PageHeader";
import DayBars from "@/components/admin/DayBars";
import QuickActions from "@/components/admin/QuickActions";
import Icon from "@/components/Icon";
import { LINK, PANEL, StatusBadge } from "@/components/ui";
import { dayLabel, KIND_LABEL, money, STATUS_LABEL, timeLabel, until } from "@/lib/format";
import { requireAdmin } from "@/lib/server/auth";
import { one, query } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import type { Reservation, Status } from "@/lib/types";

const LIST = `
  SELECT r.*, concat_ws(' ', c.make, c.model, nullif(c.trim_level, '')) AS car_name
    FROM reservations r JOIN cars c ON c.id = r.car_id`;
const TZ = "'Africa/Tunis'";

type Totals = {
  pending: number;
  today: number;
  revenue: number;
  revenue_prev: number;
  bookings: number;
  bookings_prev: number;
  km: number;
  clients: number;
  clients_new: number;
};

/* status colours are reserved for status, and always come with their label */
const STATUS_BAR: Record<Status, string> = {
  pending: "bg-[#e8b86d]",
  confirmed: "bg-aqua",
  ongoing: "bg-[#8fb4ff]",
  completed: "bg-[#7fd6a0]",
  cancelled: "bg-coral",
};

export default async function Page() {
  const admin = await requireAdmin();
  const [settings, t, days, todo, agenda, mix] = await Promise.all([
    getSettings(),
    one<Totals>(`
      WITH b AS (SELECT date_trunc('month', now(), ${TZ}) AS m0)
      SELECT
        (SELECT count(*)::int FROM reservations WHERE status = 'pending') AS pending,
        (SELECT count(*)::int FROM reservations
          WHERE status IN ('pending', 'confirmed', 'ongoing')
            AND start_at >= date_trunc('day', now(), ${TZ}) AND start_at < date_trunc('day', now(), ${TZ}) + interval '1 day') AS today,
        (SELECT coalesce(sum(total_price), 0)::float FROM reservations, b WHERE created_at >= b.m0 AND status <> 'cancelled') AS revenue,
        -- same number of days last month, so the comparison is fair mid-month
        (SELECT coalesce(sum(total_price), 0)::float FROM reservations, b
          WHERE created_at >= b.m0 - interval '1 month' AND created_at < now() - interval '1 month' AND status <> 'cancelled') AS revenue_prev,
        (SELECT count(*)::int FROM reservations, b WHERE created_at >= b.m0) AS bookings,
        (SELECT count(*)::int FROM reservations, b WHERE created_at >= b.m0 - interval '1 month' AND created_at < now() - interval '1 month') AS bookings_prev,
        (SELECT coalesce(sum(quantity), 0)::float FROM reservations, b WHERE created_at >= b.m0 AND kind = 'transfer' AND status <> 'cancelled') AS km,
        (SELECT count(*)::int FROM users WHERE role = 'client') AS clients,
        (SELECT count(*)::int FROM users, b WHERE role = 'client' AND created_at >= b.m0) AS clients_new`),
    // one index range scan grouped by day, laid over the calendar so empty days show as 0
    query<{ day: Date; n: number; revenue: number }>(`
      SELECT d.day, coalesce(c.n, 0) AS n, coalesce(c.revenue, 0)::float AS revenue
        FROM generate_series(date_trunc('day', now(), ${TZ}) - interval '13 days', date_trunc('day', now(), ${TZ}), interval '1 day') AS d(day)
        LEFT JOIN (
          SELECT date_trunc('day', created_at, ${TZ}) AS day, count(*)::int AS n,
                 sum(total_price) FILTER (WHERE status <> 'cancelled') AS revenue
            FROM reservations
           WHERE created_at >= date_trunc('day', now(), ${TZ}) - interval '13 days'
           GROUP BY 1
        ) c USING (day)
       ORDER BY d.day`),
    query<Reservation>(`${LIST} WHERE r.status = 'pending' ORDER BY r.start_at LIMIT 6`),
    query<Reservation>(
      `${LIST} WHERE r.status IN ('pending', 'confirmed', 'ongoing') AND r.end_at >= now()
                 AND r.start_at < date_trunc('day', now(), ${TZ}) + interval '2 days'
        ORDER BY r.start_at, r.id LIMIT 10`,
    ),
    query<{ status: Status; n: number }>(
      `SELECT status, count(*)::int AS n FROM reservations WHERE created_at >= date_trunc('month', now(), ${TZ}) GROUP BY status`,
    ),
  ]);
  const k = t!;
  const trend = (now: number, before: number) => {
    if (!before) return null;
    const p = Math.round(((now - before) / before) * 100);
    return { up: p >= 0, text: `${p >= 0 ? "+" : ""}${p} %` };
  };
  const mixTotal = mix.reduce((s, m) => s + m.n, 0);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Tunis" }).format(new Date())) % 24;
  const hello = hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour";
  const noPrice = settings.price_per_km === 0;

  const tiles = [
    { label: "À traiter", value: String(k.pending), hint: "demandes en attente", icon: "clock", href: "/admin/reservations?status=pending", alert: k.pending > 0 },
    { label: "Départs aujourd'hui", value: String(k.today), hint: "confirmés ou en attente", icon: "calendar", href: "/admin/reservations" },
    { label: "Chiffre du mois", value: money(k.revenue, settings.currency), hint: `${k.bookings} réservation${k.bookings > 1 ? "s" : ""}`, icon: "wallet", trend: trend(k.revenue, k.revenue_prev) },
    { label: "Kilomètres du mois", value: `${Math.round(k.km).toLocaleString("fr-FR")} km`, hint: "transferts", icon: "road" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Tunis" }).format(new Date())}
        title={`${hello}, ${admin.full_name.split(" ")[0]}.`}
        sub={k.pending ? `${k.pending} demande${k.pending > 1 ? "s" : ""} attend${k.pending > 1 ? "ent" : ""} votre réponse.` : "Tout est à jour."}
      >
        <Link prefetch={false} href="/admin/reservations" className="btn btn--solid min-h-12">
          <Icon name="list" size={18} /> Réservations
        </Link>
      </PageHeader>

      {noPrice && (
        <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[#e8b86d]/40 bg-[#e8b86d]/10 px-5 py-4 text-sm text-[#f3d6a4]">
          <span className="flex-1">Le prix au kilomètre global n&apos;est pas défini : seuls les véhicules ayant leur propre tarif sont proposés en transfert.</span>
          <Link prefetch={false} className="font-semibold underline" href="/admin/tarifs">
            Configurer
          </Link>
        </p>
      )}

      <dl className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-xs text-mist">{tile.label}</dt>
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tile.alert ? "bg-sand/15 text-sand" : "bg-aqua/10 text-aqua"}`}>
                  <Icon name={tile.icon} size={18} />
                </span>
              </div>
              <dd className="mt-1 font-display text-[clamp(1.15rem,4.8vw,1.9rem)] leading-tight font-extrabold break-words tabular-nums">{tile.value}</dd>
              <dd className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fog">
                {tile.trend && (
                  <span className={`font-semibold ${tile.trend.up ? "text-[#a6e6bf]" : "text-[#f5b39a]"}`}>
                    {tile.trend.up ? "▲" : "▼"} {tile.trend.text}
                  </span>
                )}
                <span>{tile.trend ? "vs mois dernier" : tile.hint}</span>
              </dd>
            </>
          );
          const cls = `block min-w-0 rounded-2xl border p-4 sm:p-5 ${tile.alert ? "border-sand/30 bg-sand/[0.06]" : "border-hair bg-white/[0.03]"}`;
          return tile.href ? (
            <Link prefetch={false} key={tile.label} href={tile.href} className={`${cls} transition-colors hover:border-line`}>
              {body}
            </Link>
          ) : (
            <div key={tile.label} className={cls}>
              {body}
            </div>
          );
        })}
      </dl>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* pending requests */}
          <section className={PANEL}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base">
                À traiter {k.pending > 0 && <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-bold text-[#02211f]">{k.pending}</span>}
              </h2>
              <Link prefetch={false} className={`${LINK} inline-flex min-h-11 items-center text-sm`} href="/admin/reservations?status=pending">
                Tout voir
              </Link>
            </div>
            {todo.length === 0 ? (
              <p className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 text-sm text-mist">
                <span className="grid size-9 place-items-center rounded-full bg-[#7fd6a0]/15 text-[#a6e6bf]">
                  <Icon name="check" size={18} />
                </span>
                Aucune demande en attente.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-hair">
                {todo.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <Link prefetch={false} href={`/admin/reservations/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-aqua">
                      <Avatar name={r.customer_name} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{r.customer_name}</span>
                        <span className="block truncate text-xs text-mist">
                          <span className="first-letter:uppercase">{dayLabel(r.start_at)}</span> {timeLabel(r.start_at)} · {KIND_LABEL[r.kind]} ·{" "}
                          <b className="text-ink">{money(r.total_price, r.currency)}</b>
                        </span>
                        <span className="block truncate text-xs text-fog">
                          {r.pickup_label}
                          {r.dropoff_label && ` → ${r.dropoff_label}`}
                        </span>
                      </span>
                    </Link>
                    <QuickActions id={r.id} compact />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* activity */}
          <section className={PANEL}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-base">Réservations reçues · 14 jours</h2>
              <p className="text-sm text-mist">
                <b className="text-ink tabular-nums">{days.reduce((s, d) => s + d.n, 0)}</b> au total
              </p>
            </div>
            <DayBars days={days} currency={settings.currency} />
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {/* agenda */}
          <section className={PANEL}>
            <h2 className="mb-3 text-base">Aujourd&apos;hui et demain</h2>
            {agenda.length === 0 ? (
              <p className="rounded-2xl bg-white/[0.03] p-4 text-sm text-mist">Aucun départ prévu.</p>
            ) : (
              <ol className="relative flex flex-col gap-1 before:absolute before:top-3 before:bottom-3 before:left-[27px] before:w-px before:bg-line">
                {agenda.map((r) => (
                  <li key={r.id}>
                    <Link prefetch={false} href={`/admin/reservations/${r.id}`} className="relative flex min-h-14 items-center gap-3 rounded-xl py-2 pr-2 hover:bg-white/[0.04]">
                      <span className="relative z-10 w-14 shrink-0 rounded-lg bg-night-2 py-1 text-center font-display text-sm font-extrabold tabular-nums">
                        {timeLabel(r.start_at)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{r.customer_name}</span>
                        <span className="block truncate text-xs text-mist">
                          {r.pickup_label}
                          {r.dropoff_label && ` → ${r.dropoff_label}`}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={r.status} />
                        <span className="text-[0.68rem] text-aqua">{until(r.start_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* month mix */}
          <section className={PANEL}>
            <div className="mb-4 flex items-end justify-between gap-2">
              <h2 className="text-base">Ce mois-ci</h2>
              <p className="text-sm text-mist">
                <b className="text-ink tabular-nums">{mixTotal}</b> réservations
              </p>
            </div>
            {mixTotal > 0 && (
              <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Répartition des réservations du mois par statut">
                {(Object.keys(STATUS_BAR) as Status[]).map((s) => {
                  const n = mix.find((m) => m.status === s)?.n ?? 0;
                  return n ? <span key={s} className={STATUS_BAR[s]} style={{ width: `${(n / mixTotal) * 100}%` }} /> : null;
                })}
              </div>
            )}
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {(Object.keys(STATUS_BAR) as Status[]).map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${STATUS_BAR[s]}`} aria-hidden="true" />
                  <span className="flex-1 text-mist">{STATUS_LABEL[s]}</span>
                  <b className="tabular-nums">{mix.find((m) => m.status === s)?.n ?? 0}</b>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-hair pt-3 text-xs text-fog">
              {k.clients} clients inscrits{k.clients_new ? `, dont ${k.clients_new} ce mois-ci` : ""}.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
