import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/app/PageHeader";
import ClientCard, { type ClientRow } from "@/components/admin/ClientCard";
import NewClient from "@/components/admin/NewClient";
import Icon from "@/components/Icon";
import { INPUT } from "@/components/ui";
import { dateOnly, money } from "@/lib/format";
import { one, query } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import { SITE } from "@/lib/site";
import { clean, toInt } from "@/lib/validate";

export const metadata: Metadata = { title: "Clients" };

type Row = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: Date;
  bookings: number;
  spent: number;
  last_at: Date | null;
};

const PAGE = 30;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = clean(sp.q, 60);
  const before = toInt(sp.before, 1, 2_147_483_647);
  const params: unknown[] = [];
  const where = ["u.role = 'client'"];
  if (before) where.push(`u.id < $${params.push(before)}`);
  if (q) {
    const like = `$${params.push(`%${q.replace(/[%_\\]/g, "\\$&")}%`)}`;
    where.push(`(u.full_name ILIKE ${like} OR u.email ILIKE ${like} OR u.phone ILIKE ${like})`);
  }
  // the page of users is cut first, then totals are computed for those 30 rows only
  const [rows, settings, stats] = await Promise.all([
    query<Row>(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at,
              t.bookings, t.spent, t.last_at
         FROM (SELECT * FROM users u WHERE ${where.join(" AND ")} ORDER BY u.id DESC LIMIT $${params.push(PAGE + 1)}) u
         CROSS JOIN LATERAL (
           SELECT count(*)::int AS bookings,
                  coalesce(sum(total_price) FILTER (WHERE status = 'completed'), 0)::float AS spent,
                  max(start_at) AS last_at
             FROM reservations r WHERE r.user_id = u.id
         ) t
        ORDER BY u.id DESC`,
      params,
    ),
    getSettings(),
    one<{ total: number; fresh: number; booked: number; blocked: number }>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS fresh,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM reservations r WHERE r.user_id = u.id))::int AS booked,
              count(*) FILTER (WHERE NOT is_active)::int AS blocked
         FROM users u WHERE role = 'client'`,
    ),
  ]);
  const more = rows.length > PAGE;
  const list = rows.slice(0, PAGE);
  const month = Date.now() - 30 * 86_400_000;
  const cards: ClientRow[] = list.map((u) => ({
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone,
    active: u.is_active,
    since: dateOnly(u.created_at),
    fresh: u.created_at.getTime() > month,
    bookings: u.bookings,
    spent: money(u.spent, settings.currency),
    // short: "5 oct.", with the year only when it is not this one
    last: u.last_at
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "short",
          ...(u.last_at.getFullYear() !== new Date().getFullYear() ? { year: "2-digit" as const } : {}),
          timeZone: "Africa/Tunis",
        }).format(u.last_at)
      : null,
  }));
  const href = (b?: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (b) p.set("before", String(b));
    const s = p.toString();
    return `/admin/clients${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Administration" title="Clients" sub="Qui réserve, combien et depuis quand." />
      <dl className="-mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["Clients", stats?.total ?? 0, "users"],
          ["Nouveaux", stats?.fresh ?? 0, "plus"],
          ["Ont réservé", stats?.booked ?? 0, "calendar"],
          ["Bloqués", stats?.blocked ?? 0, "lock"],
        ].map(([k, v, icon]) => (
          <div key={k as string} className="flex items-center gap-3 rounded-2xl border border-hair bg-white/[0.03] p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-aqua/12 text-aqua">
              <Icon name={icon as string} size={18} />
            </span>
            <span className="min-w-0">
              <dt className="truncate text-xs text-fog">
                {k}
                {k === "Nouveaux" && <span className="max-sm:hidden"> · 30 jours</span>}
              </dt>
              <dd className="font-display text-xl font-extrabold tabular-nums">{v}</dd>
            </span>
          </div>
        ))}
      </dl>
      <NewClient site={SITE.url}>
        <form className="flex gap-2" action="/admin/clients" role="search">
          <input className={`${INPUT} min-w-0 flex-1`} name="q" type="search" enterKeyHint="search" defaultValue={q} placeholder="Nom, e-mail, téléphone" maxLength={60} />
          <button className="btn btn--ghost shrink-0" type="submit">
            <span className="max-sm:hidden">Rechercher</span>
            <span className="sm:hidden" aria-label="Rechercher">
              →
            </span>
          </button>
        </form>
      </NewClient>

      {cards.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-10 text-center text-sm text-mist">
          {q ? `Aucun client trouvé pour « ${q} ».` : "Aucun client pour le moment : ajoutez le premier avec « Nouveau client »."}
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-3">
          {cards.map((c) => (
            <ClientCard key={c.id} c={c} />
          ))}
        </ul>
      )}

      <div className="flex justify-between">
        {before ? (
          <Link prefetch={false} className="btn btn--ghost" href={href()}>
            ← Plus récents
          </Link>
        ) : (
          <span />
        )}
        {more && (
          <Link prefetch={false} className="btn btn--ghost" href={href(list[list.length - 1].id)}>
            Suivants →
          </Link>
        )}
      </div>
    </div>
  );
}
