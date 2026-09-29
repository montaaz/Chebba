import type { Metadata } from "next";
import Link from "next/link";
import { toggleUserAction } from "@/app/actions/admin";
import Avatar from "@/components/app/Avatar";
import PageHeader from "@/components/app/PageHeader";
import { INPUT } from "@/components/ui";
import { dateOnly, money } from "@/lib/format";
import { query } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
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
  const [rows, settings] = await Promise.all([
    query<Row>(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at,
              t.bookings, t.spent
         FROM (SELECT * FROM users u WHERE ${where.join(" AND ")} ORDER BY u.id DESC LIMIT $${params.push(PAGE + 1)}) u
         CROSS JOIN LATERAL (
           SELECT count(*)::int AS bookings,
                  coalesce(sum(total_price) FILTER (WHERE status = 'completed'), 0)::float AS spent
             FROM reservations r WHERE r.user_id = u.id
         ) t
        ORDER BY u.id DESC`,
      params,
    ),
    getSettings(),
  ]);
  const more = rows.length > PAGE;
  const list = rows.slice(0, PAGE);
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
      <form className="flex gap-2" action="/admin/clients" role="search">
        <input className={`${INPUT} min-w-0 md:max-w-md`} name="q" type="search" enterKeyHint="search" defaultValue={q} placeholder="Nom, e-mail, téléphone" maxLength={60} />
        <button className="btn btn--ghost shrink-0" type="submit">
          <span className="max-sm:hidden">Rechercher</span>
          <span className="sm:hidden" aria-label="Rechercher">
            →
          </span>
        </button>
      </form>

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2 lg:hidden">
        {list.map((u) => (
          <li key={u.id} className="rounded-2xl border border-hair bg-white/[0.03] p-4">
            <p className="flex items-center gap-3">
              <Avatar name={u.full_name} size={40} />
              <span className="min-w-0 flex-1 truncate font-semibold">{u.full_name}</span>
              {!u.is_active && <span className="shrink-0 rounded-full border border-coral/40 px-2 py-0.5 text-[0.68rem] text-[#f5b39a]">✕ Bloqué</span>}
            </p>
            <p className="mt-1 truncate text-xs text-mist">{u.email}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-fog">Réservations</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">{u.bookings}</dd>
              </div>
              <div>
                <dt className="text-fog">Dépensé</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">{money(u.spent, settings.currency)}</dd>
              </div>
              <div>
                <dt className="text-fog">Inscrit le</dt>
                <dd className="mt-0.5 text-sm">{dateOnly(u.created_at)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-hair pt-3">
              <a className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold" href={`tel:${u.phone.replace(/[^\d+]/g, "")}`}>
                Appeler
              </a>
              <Link prefetch={false} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold" href={`/admin/reservations?q=${encodeURIComponent(u.phone)}`}>
                Réservations
              </Link>
              <form action={toggleUserAction} className="flex-1">
                <input type="hidden" name="id" value={u.id} />
                <button className="min-h-11 w-full cursor-pointer rounded-full border border-hair px-4 text-sm text-mist" type="submit">
                  {u.is_active ? "Bloquer" : "Débloquer"}
                </button>
              </form>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mist sm:col-span-2">Aucun client trouvé.</li>}
      </ul>

      <div className="overflow-x-auto rounded-2xl border border-hair max-lg:hidden">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs text-fog">
            <tr>
              {["Client", "Contact", "Inscrit le", "Réservations", "Dépensé", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-hair hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={u.full_name} size={34} />
                    <span className="font-semibold">{u.full_name}</span>
                  </span>
                  {!u.is_active && <span className="ml-2 rounded-full border border-coral/40 px-2 py-0.5 text-[0.68rem] text-[#f5b39a]">✕ Bloqué</span>}
                </td>
                <td className="px-4 py-3 text-xs text-mist">
                  <p>{u.email}</p>
                  <p>{u.phone}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-mist">{dateOnly(u.created_at)}</td>
                <td className="px-4 py-3 tabular-nums">
                  <Link prefetch={false} className="inline-flex min-h-11 min-w-11 items-center hover:text-aqua hover:underline" href={`/admin/reservations?q=${encodeURIComponent(u.phone)}`}>
                    {u.bookings}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">{money(u.spent, settings.currency)}</td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleUserAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className="min-h-11 cursor-pointer px-2 text-sm text-mist hover:text-ink hover:underline" type="submit">
                      {u.is_active ? "Bloquer" : "Débloquer"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-mist">
                  Aucun client trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
