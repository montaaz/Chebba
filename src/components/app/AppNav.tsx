"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { SITE } from "@/lib/site";
import Icon from "../Icon";
import Avatar from "./Avatar";

type Item = { href: string; label: string; icon: string; badge?: number; exact?: boolean; tab?: boolean; main?: boolean };

type Props = {
  area: "client" | "admin";
  user: { full_name: string; email: string; role: string };
  unread: number;
  pending: number;
};

/* Navigation of the logged-in areas.
   ≥1024px: fixed sidebar.  <1024px: top bar (brand, bell, account menu) + bottom tab bar. */
export default function AppNav({ area, user, unread, pending }: Props) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [path]);

  const items: Item[] =
    area === "admin"
      ? [
          { href: "/admin", label: "Tableau de bord", icon: "grid", exact: true, tab: true },
          { href: "/admin/reservations", label: "Réservations", icon: "list", badge: pending, tab: true },
          { href: "/admin/clients", label: "Clients", icon: "users", tab: true },
          { href: "/admin/vehicules", label: "Véhicules", icon: "car", tab: true },
          { href: "/admin/tarifs", label: "Tarifs", icon: "sliders", tab: true },
          { href: "/notifications", label: "Notifications", icon: "bell", badge: unread },
        ]
      : [
          { href: "/compte", label: "Mes trajets", icon: "route", exact: true, tab: true },
          { href: "/reserver", label: "Réserver", icon: "plus", tab: true, main: true },
          { href: "/notifications", label: "Alertes", icon: "bell", badge: unread, tab: true },
          { href: "/compte/profil", label: "Profil", icon: "user", tab: true },
        ];
  const on = (it: Item) => (it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/"));
  const badge = (n?: number) =>
    n ? (
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sand px-1.5 text-[0.68rem] leading-none font-bold text-[#02211f]">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;
  const first = user.full_name.split(" ")[0];

  return (
    <>
      {/* ---------------- desktop sidebar ---------------- */}
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-hair bg-[#021517] px-4 py-6 lg:flex">
        <Link prefetch={false} href="/" className="flex flex-col px-3 leading-none">
          <span className="font-display text-[1.05rem] font-extrabold tracking-[0.2em] uppercase">{SITE.brand}</span>
          <span className="mt-1.5 text-[0.58rem] tracking-[0.42em] text-aqua uppercase">{SITE.brandSub}</span>
        </Link>
        <p className="mt-9 mb-2 px-3 text-[0.66rem] font-semibold tracking-[0.2em] text-fog uppercase">
          {area === "admin" ? "Administration" : "Espace client"}
        </p>
        <nav className="flex flex-col gap-1" aria-label={area === "admin" ? "Administration" : "Espace client"}>
          {items.map((it) => (
            <Link
              prefetch={false}
              key={it.href}
              href={it.href}
              aria-current={on(it) ? "page" : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${on(it) ? "bg-aqua/12 font-semibold text-ink" : "text-mist hover:bg-white/5 hover:text-ink"}`}
            >
              <span className={on(it) ? "text-aqua" : "text-fog group-hover:text-mist"}>
                <Icon name={it.icon} size={19} />
              </span>
              <span className="flex-1">{it.label}</span>
              {badge(it.badge)}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          {area === "admin" ? (
            <Link prefetch={false} href="/reserver" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-mist hover:bg-white/5 hover:text-ink">
              <Icon name="plus" size={19} /> Nouvelle réservation
            </Link>
          ) : null}
          <Link prefetch={false} href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-mist hover:bg-white/5 hover:text-ink">
            <Icon name="external" size={19} /> Voir le site
          </Link>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-hair bg-white/[0.03] p-3">
            <Avatar name={user.full_name} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.full_name}</p>
              <p className="truncate text-xs text-fog">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="grid size-10 cursor-pointer place-items-center rounded-xl text-fog hover:bg-white/5 hover:text-ink" aria-label="Déconnexion" title="Déconnexion">
                <Icon name="exit" size={19} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ---------------- phone / tablet top bar ---------------- */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-hair bg-night/90 py-2 pr-[max(var(--pad),env(safe-area-inset-right))] pl-[max(var(--pad),env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
        <Link prefetch={false} href="/" className="flex min-h-11 flex-col justify-center leading-none">
          <span className="font-display text-[0.98rem] font-extrabold tracking-[0.2em] uppercase">{SITE.brand}</span>
          <span className="mt-1 text-[0.54rem] tracking-[0.36em] text-aqua uppercase">{area === "admin" ? "Administration" : "Espace client"}</span>
        </Link>
        <div className="flex items-center gap-1">
          {area === "admin" && (
            <Link
              prefetch={false}
              href="/notifications"
              className="relative grid size-11 place-items-center rounded-full text-mist"
              aria-label={unread ? `Notifications : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
            >
              <Icon name="bell" size={21} />
              {unread > 0 && (
                <span className="absolute top-1 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sand px-1 text-[0.62rem] font-bold text-[#02211f]">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          )}
          <button
            type="button"
            className="grid size-11 cursor-pointer place-items-center rounded-full"
            aria-label="Mon compte"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            <Avatar name={user.full_name} size={34} />
          </button>
        </div>
        {menu && (
          <>
            <button type="button" className="fixed inset-0 z-40 cursor-default bg-black/40" aria-label="Fermer le menu" onClick={() => setMenu(false)} />
            <div className="absolute top-full right-[max(var(--pad),env(safe-area-inset-right))] z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-line bg-night-2 p-2 shadow-[0_30px_60px_-20px_#000]">
              <div className="flex items-center gap-3 border-b border-hair p-3">
                <Avatar name={user.full_name} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Bonjour, {first}</p>
                  <p className="truncate text-xs text-fog">{user.email}</p>
                </div>
              </div>
              {area === "admin" &&
                items
                  .filter((it) => !it.tab)
                  .map((it) => (
                    <Link prefetch={false} key={it.href} href={it.href} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm hover:bg-white/5">
                      <Icon name={it.icon} size={19} /> <span className="flex-1">{it.label}</span> {badge(it.badge)}
                    </Link>
                  ))}
              {area === "admin" && (
                <Link prefetch={false} href="/reserver" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm hover:bg-white/5">
                  <Icon name="plus" size={19} /> Nouvelle réservation
                </Link>
              )}
              <Link prefetch={false} href="/" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm hover:bg-white/5">
                <Icon name="external" size={19} /> Voir le site
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-[#f5b39a] hover:bg-white/5">
                  <Icon name="exit" size={19} /> Déconnexion
                </button>
              </form>
            </div>
          </>
        )}
      </header>

      {/* ---------------- phone / tablet bottom tabs ---------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t border-line bg-night/95 px-[max(0.25rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Navigation"
      >
        {items
          .filter((it) => it.tab)
          .map((it) => (
            <Link
              prefetch={false}
              key={it.href}
              href={it.href}
              aria-current={on(it) ? "page" : undefined}
              className={`relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[0.64rem] font-semibold ${on(it) ? "text-aqua" : "text-mist"}`}
            >
              <span
                className={
                  it.main
                    ? "grid size-10 place-items-center rounded-full bg-linear-to-br from-aqua to-teal text-[#02211f] shadow-[0_8px_20px_-8px_rgb(134_207_207/0.9)]"
                    : `grid h-7 w-12 place-items-center rounded-full transition-colors ${on(it) ? "bg-aqua/15" : ""}`
                }
              >
                <Icon name={it.icon} size={it.main ? 20 : 21} />
              </span>
              <span className="max-w-full truncate px-0.5">{it.label === "Tableau de bord" ? "Accueil" : it.label}</span>
              {it.badge ? (
                <span className="absolute top-1.5 left-1/2 ml-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sand px-1 text-[0.6rem] font-bold text-[#02211f]">
                  {it.badge > 99 ? "99+" : it.badge}
                </span>
              ) : null}
            </Link>
          ))}
      </nav>
    </>
  );
}
