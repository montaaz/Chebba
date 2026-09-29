"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

/* Phone navigation: a thumb-reach tab bar, like a native app. Hidden from 768px up. */
export default function BottomNav({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Accueil", icon: "home", on: path === "/" },
    { href: "/reserver", label: "Réserver", icon: "route", on: path.startsWith("/reserver"), main: true },
    { href: "/compte", label: "Compte", icon: "user", on: path.startsWith("/compte") || path === "/connexion" || path === "/inscription" },
    ...(admin ? [{ href: "/admin", label: "Admin", icon: "grid", on: path.startsWith("/admin") }] : []),
  ];
  return (
    <>
      {/* keeps the end of the page clear of the bar */}
      <div className="h-[calc(4.75rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />
      <nav
        className="fixed inset-x-0 bottom-0 z-60 flex items-stretch justify-around border-t border-line bg-night/95 px-[max(0.5rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Navigation principale"
      >
        {items.map((it) => (
          <Link prefetch={false}
            key={it.href}
            href={it.href}
            aria-current={it.on ? "page" : undefined}
            className={`flex min-h-16 min-w-16 flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold transition-colors ${it.on ? "text-aqua" : "text-mist"}`}
          >
            <span
              className={
                it.main
                  ? "grid size-10 place-items-center rounded-full bg-linear-to-br from-aqua to-teal text-[#02211f] shadow-[0_8px_20px_-8px_rgb(134_207_207/0.9)]"
                  : "grid h-7 place-items-center"
              }
            >
              <Icon name={it.icon} size={it.main ? 20 : 22} />
            </span>
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
