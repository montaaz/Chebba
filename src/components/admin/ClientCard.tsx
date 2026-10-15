"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toggleUserAction } from "@/app/actions/admin";
import Avatar from "@/components/app/Avatar";
import DeleteClient from "@/components/admin/DeleteClient";
import Icon from "@/components/Icon";
import { noEmail } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

export type ClientRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  since: string;
  fresh: boolean;
  bookings: number;
  spent: string;
  last: string | null;
};

/* One client in the list: who, how to reach them, what they booked, and every action at hand. */
export default function ClientCard({ c }: { c: ClientRow }) {
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const tel = c.phone.replace(/[^\d+]/g, "");

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const item = "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm hover:bg-white/[0.07]";

  return (
    <li
      className={`group relative flex flex-col rounded-3xl border bg-linear-to-b from-white/[0.05] to-white/[0.015] p-4 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-line hover:shadow-[0_24px_50px_-30px_rgb(134_207_207/0.45)] ${c.active ? "border-hair" : "border-coral/30"} ${menu ? "z-30" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={c.name} size={48} />
        <div className="min-w-0 flex-1 pt-0.5">
          <Link prefetch={false} href={`/admin/clients/${c.id}`} className="block truncate font-display text-[1.05rem] font-medium hover:text-aqua">
            <span className="absolute inset-0 rounded-3xl" aria-hidden="true" />
            {c.name}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-fog">
            Depuis le {c.since}
            {!c.active ? (
              <span className="rounded-full bg-coral/15 px-2 py-0.5 font-semibold text-[#f5b39a]">Bloqué</span>
            ) : c.fresh ? (
              <span className="rounded-full bg-aqua/15 px-2 py-0.5 font-semibold text-aqua">Nouveau</span>
            ) : null}
          </p>
        </div>
        {/* above the card's own buttons while the menu is open */}
        <div ref={box} className="relative z-20">
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-label={`Actions pour ${c.name}`}
            className="grid size-11 cursor-pointer place-items-center rounded-full text-mist transition-colors hover:bg-white/[0.08] hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
          {menu && (
            <div className="absolute top-12 right-0 z-30 w-60 rounded-2xl border border-line bg-[#03262a] p-1.5 shadow-[0_30px_60px_-20px_#000]" role="menu">
              <Link prefetch={false} role="menuitem" className={item} href={`/admin/clients/${c.id}#modifier`}>
                <Icon name="sliders" size={17} /> Modifier les coordonnées
              </Link>
              <Link prefetch={false} role="menuitem" className={item} href={`/admin/clients/${c.id}`}>
                <Icon name="user" size={17} /> Ouvrir la fiche
              </Link>
              <form action={toggleUserAction}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" role="menuitem" className={`${item} ${c.active ? "text-[#f5b39a]" : "text-aqua"}`}>
                  <Icon name="lock" size={17} /> {c.active ? "Bloquer" : "Débloquer"}
                </button>
              </form>
              {c.bookings === 0 ? (
                <div className="mt-1 border-t border-hair px-1 pt-2 pb-1">
                  <DeleteClient id={c.id} name={c.name} bookings={0} />
                </div>
              ) : (
                <p className="mt-1 border-t border-hair px-3 pt-2 pb-1.5 text-xs text-fog">
                  Suppression impossible : {c.bookings} réservation{c.bookings > 1 ? "s" : ""} à son nom.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-1 text-sm">
        <span className={`flex min-w-0 items-center gap-2 ${noEmail(c.email) ? "text-fog italic" : "text-mist"}`}>
          <span className="text-fog" aria-hidden="true">@</span>
          <span className="truncate pr-1">{noEmail(c.email) ? "Sans e-mail" : c.email}</span>
        </span>
        <span className="flex items-center gap-2 text-mist tabular-nums">
          <Icon name="phone" size={14} /> {c.phone}
        </span>
      </div>

      <dl className="mt-3.5 grid grid-cols-3 gap-1.5 text-center">
        {[
          ["Réserv.", String(c.bookings)],
          ["Dépensé", c.spent],
          ["Dernière", c.last ?? "—"],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-xl bg-black/20 px-1.5 py-2">
            <dt className="text-[0.62rem] tracking-wider text-fog uppercase">{k}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="relative z-10 mt-3.5 grid grid-cols-3 gap-1.5">
        <a className="btn btn--ghost min-h-11 px-2 text-sm" href={`tel:${tel}`} aria-label={`Appeler ${c.name}`}>
          <Icon name="phone" size={16} /> <span className="max-[380px]:hidden">Appeler</span>
        </a>
        <a className="btn btn--ghost min-h-11 px-2 text-sm" href={waLink(c.phone, `Bonjour ${c.name.split(" ")[0]}, `)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`}>
          <Icon name="chat" size={16} /> <span className="max-[380px]:hidden">WhatsApp</span>
        </a>
        <Link prefetch={false} className="btn btn--solid min-h-11 px-2 text-sm" href={`/admin/clients/${c.id}`}>
          Fiche <Icon name="arrow" size={16} />
        </Link>
      </div>
    </li>
  );
}
