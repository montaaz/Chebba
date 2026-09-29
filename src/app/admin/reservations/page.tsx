import type { Metadata } from "next";
import Link from "next/link";
import Avatar from "@/components/app/Avatar";
import PageHeader from "@/components/app/PageHeader";
import TripRow from "@/components/app/TripRow";
import QuickActions from "@/components/admin/QuickActions";
import Icon from "@/components/Icon";
import { INPUT, StatusBadge } from "@/components/ui";
import { dayLabel, KIND_LABEL, money, STATUS_LABEL, timeLabel, until } from "@/lib/format";
import { listReservations } from "@/lib/server/booking";
import { query } from "@/lib/server/db";
import { clean } from "@/lib/validate";
import type { Status } from "@/lib/types";

export const metadata: Metadata = { title: "Réservations" };

const STATUSES = Object.keys(STATUS_LABEL) as Status[];

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : undefined;
  const kind = sp.kind === "rental" || sp.kind === "transfer" ? sp.kind : undefined;
  const q = clean(sp.q, 60) || undefined;
  // "À venir" is the working view; any status filter or search looks through everything
  const view = sp.vue === "toutes" || status || q ? "all" : "upcoming";
  const cursor = clean(sp.apres, 40) || undefined;
  const [{ rows, next }, counts] = await Promise.all([
    listReservations({ view, status, kind, q, cursor }),
    query<{ status: Status; n: number }>("SELECT status, count(*)::int AS n FROM reservations GROUP BY status"),
  ]);
  const count = (s: Status) => counts.find((c) => c.status === s)?.n ?? 0;
  const total = counts.reduce((t, c) => t + c.n, 0);

  const link = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, kind, q, ...extra })) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/reservations${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${on ? "border-aqua bg-aqua/15 text-ink" : "border-hair text-mist hover:border-line hover:text-ink"}`;
  const n = (v: number) => <span className="rounded-full bg-white/10 px-1.5 text-[0.7rem] tabular-nums">{v}</span>;

  return (
    <>
      <PageHeader eyebrow="Administration" title="Réservations" sub={`${total} au total · ${count("pending")} en attente`}>
        <Link prefetch={false} href="/reserver" className="btn btn--solid min-h-12">
          <Icon name="plus" size={18} /> Nouvelle
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3">
        <form className="relative" action="/admin/reservations" role="search">
          {kind && <input type="hidden" name="kind" value={kind} />}
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fog">
            <Icon name="list" size={18} />
          </span>
          <input className={`${INPUT} pl-11 lg:max-w-lg`} name="q" type="search" enterKeyHint="search" defaultValue={q} placeholder="Rechercher : référence, nom, téléphone" maxLength={60} />
        </form>
        <div className="-mx-(--pad) flex gap-1.5 overflow-x-auto px-(--pad) pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden">
          <Link prefetch={false} className={chip(view === "upcoming" && !status)} href={link({ status: undefined, q: undefined })}>
            <Icon name="calendar" size={16} /> À venir
          </Link>
          <Link prefetch={false} className={chip(view === "all" && !status && !q)} href={link({ status: undefined, q: undefined, vue: "toutes" })}>
            Toutes {n(total)}
          </Link>
          <span className="mx-1 w-px shrink-0 bg-line" />
          {STATUSES.map((s) => (
            <Link prefetch={false} key={s} className={chip(status === s)} href={link({ status: s })}>
              {STATUS_LABEL[s]} {n(count(s))}
            </Link>
          ))}
          <span className="mx-1 w-px shrink-0 bg-line" />
          {(["transfer", "rental"] as const).map((k) => (
            <Link prefetch={false} key={k} className={chip(kind === k)} href={link({ kind: kind === k ? undefined : k, vue: view === "all" ? "toutes" : undefined })}>
              {KIND_LABEL[k]}
            </Link>
          ))}
        </div>
      </div>

      {/* phones & tablets: rows */}
      <ul className="mt-5 flex flex-col gap-2.5 xl:hidden">
        {rows.map((r) => (
          <li key={r.id} className="relative">
            <TripRow
              r={r}
              href={`/admin/reservations/${r.id}`}
              who={
                <span className="mb-1 flex items-center gap-2 text-xs text-mist">
                  <span className="truncate font-semibold text-ink">{r.customer_name}</span>
                  {r.status !== "completed" && r.status !== "cancelled" && <span className="shrink-0 text-aqua">{until(r.start_at)}</span>}
                </span>
              }
            />
          </li>
        ))}
      </ul>

      {/* wide screens: table with one-tap actions */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-hair max-xl:hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs text-fog">
            <tr>
              {["Client", "Départ", "Trajet", "Montant", "Statut", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="relative border-t border-hair transition-colors hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link prefetch={false} href={`/admin/reservations/${r.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                    <Avatar name={r.customer_name} size={36} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{r.customer_name}</span>
                      <span className="block font-display text-[0.7rem] tracking-wider text-fog">{r.reference}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="block first-letter:uppercase">{dayLabel(r.start_at)}</span>
                  <span className="block text-xs text-mist">
                    {timeLabel(r.start_at)}
                    {r.status !== "completed" && r.status !== "cancelled" && <span className="text-aqua"> · {until(r.start_at)}</span>}
                  </span>
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  <span className="block truncate">
                    {r.pickup_label}
                    {r.dropoff_label && <span className="text-fog"> → </span>}
                    {r.dropoff_label}
                  </span>
                  <span className="block text-xs text-mist">
                    {KIND_LABEL[r.kind]} · {r.car_name}
                    {r.kind === "transfer" && ` · ${Math.round(r.quantity)} km`}
                  </span>
                </td>
                <td className="px-4 py-3 font-display font-extrabold whitespace-nowrap tabular-nums">{money(r.total_price, r.currency)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="relative z-10 px-4 py-3 text-right">{r.status === "pending" && <QuickActions id={r.id} compact />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="mt-5 rounded-2xl border border-dashed border-line p-10 text-center text-sm text-mist">
          {view === "upcoming" ? "Aucun trajet à venir." : "Aucune réservation ne correspond."}
        </p>
      )}

      <div className="mt-5 flex justify-between gap-3">
        {cursor ? (
          <Link prefetch={false} className="btn btn--ghost" href={link({ vue: view === "all" ? "toutes" : undefined })}>
            ← Début
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link prefetch={false} className="btn btn--ghost" href={link({ apres: next, vue: view === "all" ? "toutes" : undefined })}>
            Suivantes →
          </Link>
        )}
      </div>
    </>
  );
}
