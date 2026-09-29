import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { getUser } from "@/lib/server/auth";
import { unreadCount } from "@/lib/server/notify";
import { SITE } from "@/lib/site";
import Icon from "./Icon";

const LINK =
  "flex min-h-11 items-center rounded-full px-3.5 text-sm text-mist transition-colors hover:bg-white/5 hover:text-ink";

/* Header of every page except the home page (which has its own, over the hero).
   On phones the links live in the bottom tab bar; the header keeps the brand and one action. */
export default async function SiteHeader() {
  const user = await getUser();
  const unread = user ? await unreadCount(user) : 0;
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-hair bg-night/85 py-2 pr-[max(var(--pad),env(safe-area-inset-right))] pl-[max(var(--pad),env(safe-area-inset-left))] backdrop-blur-lg md:py-3">
      <Link prefetch={false} className="flex min-h-11 flex-col justify-center leading-none" href="/" aria-label={`${SITE.brand} ${SITE.brandSub}`}>
        <span className="font-display text-[1.05rem] font-extrabold tracking-[0.2em] uppercase">{SITE.brand}</span>
        <span className="mt-1.5 text-[0.58rem] tracking-[0.42em] text-aqua uppercase">{SITE.brandSub}</span>
      </Link>
      <nav className="flex items-center gap-1" aria-label="Compte">
        <Link prefetch={false} className={`${LINK} max-md:hidden`} href="/reserver">
          Réserver
        </Link>
        {user?.role === "admin" && (
          <Link prefetch={false} className={`${LINK} max-md:hidden`} href="/admin">
            Admin
          </Link>
        )}
        {user ? (
          <>
            <Link prefetch={false}
              className="relative grid size-11 place-items-center rounded-full text-mist transition-colors hover:bg-white/5 hover:text-ink"
              href="/notifications"
              aria-label={unread ? `Notifications : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
            >
              <Icon name="bell" size={21} />
              {unread > 0 && (
                <span className="absolute top-1 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sand px-1 text-[0.65rem] leading-none font-bold text-[#02211f]">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <Link prefetch={false} className={`${LINK} max-md:hidden`} href="/compte">
              Mon compte
            </Link>
            <form action={logoutAction}>
              <button className={`${LINK} cursor-pointer gap-2`} type="submit">
                <Icon name="exit" size={18} />
                <span className="max-sm:sr-only">Déconnexion</span>
              </button>
            </form>
          </>
        ) : (
          <Link prefetch={false} className="btn btn--solid min-h-11 px-5 py-2.5" href="/connexion">
            Connexion
          </Link>
        )}
      </nav>
    </header>
  );
}
