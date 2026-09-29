import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import MarkRead from "@/components/MarkRead";
import { ago } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { boxOf, listNotifications, mailEnabled } from "@/lib/server/notify";
import { toInt } from "@/lib/validate";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

const MARK: Record<string, { sign: string; cls: string }> = {
  created: { sign: "+", cls: "bg-aqua/15 text-aqua" },
  confirmed: { sign: "✓", cls: "bg-aqua/15 text-aqua" },
  ongoing: { sign: "▶", cls: "bg-[#8fb4ff]/15 text-[#b9d0ff]" },
  completed: { sign: "●", cls: "bg-[#7fd6a0]/15 text-[#a6e6bf]" },
  cancelled: { sign: "✕", cls: "bg-coral/15 text-[#f5b39a]" },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/notifications");
  const box = boxOf(user, sp.box);
  const before = toInt(sp.before, 1, 2_147_483_647) ?? undefined;
  const { rows, next } = await listNotifications(user, box, before);
  const unread = rows.filter((n) => !n.read_at).length;
  const href = (n: { reservation_id: number | null }) =>
    box === "admin" && n.reservation_id ? `/admin/reservations/${n.reservation_id}` : "/compte";
  const tab = (on: boolean) =>
    `inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold ${on ? "bg-white/10 text-ink" : "text-mist"}`;

  return (
    <AppShell user={user} area={user.role === "admin" ? "admin" : "client"}>
        <div className="max-w-3xl">
          <p className="eyebrow">{box === "admin" ? "Équipe" : "Espace client"}</p>
          <h1 className="mt-3 text-[clamp(1.6rem,4vw,2.4rem)]">Notifications</h1>
          <p className="mt-2 text-sm text-mist" aria-live="polite">
            {unread ? `${unread} nouvelle${unread > 1 ? "s" : ""}` : "Tout est lu."}
          </p>

          {user.role === "admin" && (
            <nav className="mt-5 flex gap-1.5 rounded-full border border-hair p-1" aria-label="Boîte">
              <Link prefetch={false} className={tab(box === "admin")} href="/notifications" aria-current={box === "admin" ? "page" : undefined}>
                Agence
              </Link>
              <Link prefetch={false} className={tab(box === "client")} href="/notifications?box=client" aria-current={box === "client" ? "page" : undefined}>
                Personnel
              </Link>
            </nav>
          )}

          {rows.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mist">
              Aucune notification pour le moment.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-2">
              {rows.map((n) => {
                const m = MARK[n.kind] ?? MARK.created;
                return (
                  <li key={n.id}>
                    <Link prefetch={false}
                      href={href(n)}
                      className={`flex min-h-16 items-start gap-3.5 rounded-2xl border p-4 transition-colors active:bg-white/[0.07] ${n.read_at ? "border-hair bg-white/[0.02]" : "border-line bg-aqua/[0.07]"}`}
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${m.cls}`} aria-hidden="true">
                        {m.sign}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[0.95rem] leading-snug ${n.read_at ? "text-mist" : "font-semibold text-ink"}`}>
                          {!n.read_at && <span className="sr-only">Nouveau : </span>}
                          {n.title}
                        </span>
                        <span className="mt-1 block text-sm break-words text-mist">{n.body}</span>
                        <span className="mt-1.5 block text-xs text-fog">{ago(n.created_at)}</span>
                      </span>
                      {!n.read_at && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-sand" aria-hidden="true" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {next && (
            <Link prefetch={false} className="btn btn--ghost mt-5 w-full" href={`/notifications?${box === "client" && user.role === "admin" ? "box=client&" : ""}before=${next}`}>
              Notifications plus anciennes
            </Link>
          )}

          {user.role === "admin" && box === "admin" && !mailEnabled() && (
            <p className="mt-8 rounded-2xl border border-hair p-4 text-xs text-fog">
              Les e-mails automatiques sont désactivés : renseignez <code className="text-mist">SMTP_URL</code> dans{" "}
              <code className="text-mist">.env.local</code> pour les activer. Les notifications du site et WhatsApp
              fonctionnent sans cela.
            </p>
          )}
        </div>
      {unread > 0 && <MarkRead box={box} upToId={rows[0].id} />}
    </AppShell>
  );
}
