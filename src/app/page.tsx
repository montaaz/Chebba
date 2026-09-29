import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Effects from "@/components/Effects";
import Icon from "@/components/Icon";
import Lightbox from "@/components/Lightbox";
import Picture from "@/components/Picture";
import QuickBook from "@/components/QuickBook";
import { money } from "@/lib/format";
import { getActiveCars, getSettings } from "@/lib/server/settings";
import { ANGLES, CAR, FEATURES, INTERIOR, SITE, STATS, STEPS } from "@/lib/site";
import type { Car, Settings } from "@/lib/types";

/* Rebuilt in the background at most every 5 minutes; an admin save refreshes it at once. */
export const revalidate = 300;

async function load(): Promise<{ settings: Settings | null; cars: Car[] }> {
  try {
    const [settings, cars] = await Promise.all([getSettings(), getActiveCars()]);
    return { settings, cars };
  } catch {
    // the showcase must still render if the database is unreachable
    return { settings: null, cars: [] };
  }
}

const MARQUEE = ["Ibiza FR", "2026", "Boîte automatique", "Digital Cockpit", "Full LED", "Bi-zone"];

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

const TITLE = "mt-4 text-[clamp(1.7rem,4.2vw,3.1rem)]";
const SECTION = "wrap py-[clamp(4rem,9vw,8rem)]";
const CARD = "overflow-hidden rounded-[20px] border border-hair";
const LOGO = "font-display text-[1.05rem] font-extrabold uppercase tracking-[0.2em]";
const LOGO_SUB = "mt-1.5 text-[0.58rem] uppercase tracking-[0.42em] text-aqua";
const NAV_LINK =
  "relative py-1 text-[0.9rem] text-mist transition-colors hover:text-ink after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-aqua after:transition-transform after:duration-300 after:ease-expo hover:after:scale-x-100";
const PILL =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[0.92rem] font-semibold transition-colors hover:border-aqua hover:bg-aqua/10";

export default async function Home() {
  const { settings, cars } = await load();
  const currency = settings?.currency ?? "DT";
  const perDay = Math.min(...cars.filter((c) => c.for_rental && c.price_per_day > 0).map((c) => c.price_per_day));
  const perKm = settings?.price_per_km ?? 0;
  const price = Number.isFinite(perDay) ? `Location dès ${money(perDay, currency)} / jour` : "Prix calculé en ligne";
  const phone = settings?.contact_phone ?? "";
  const whatsapp = settings?.contact_whatsapp ?? "";
  const email = settings?.contact_email ?? "";
  const tel = phone.replace(/[^\d+]/g, "");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(new Date());

  return (
    <>
      <Effects />

      <header
        className="fixed inset-x-0 top-0 z-60 flex items-center justify-between gap-4 border-b border-transparent pt-[max(1rem,env(safe-area-inset-top))] pr-[max(var(--pad),env(safe-area-inset-right))] pb-4 pl-[max(var(--pad),env(safe-area-inset-left))] transition-[background,padding,border-color] duration-400 ease-soft [&.solid]:border-hair [&.solid]:bg-night/80 [&.solid]:py-2.5 [&.solid]:backdrop-blur-lg"
        data-nav
      >
        <a className="flex min-h-11 flex-col justify-center leading-none" href="#top" aria-label={`${SITE.brand} ${SITE.brandSub}`}>
          <span className={LOGO}>{SITE.brand}</span>
          <span className={LOGO_SUB}>{SITE.brandSub}</span>
        </a>
        <nav className="hidden gap-8 lg:flex" aria-label="Navigation principale">
          <a className={NAV_LINK} href="#showroom">La voiture</a>
          <a className={NAV_LINK} href="#interieur">Intérieur</a>
          <a className={NAV_LINK} href="#transfert">Transfert</a>
          <a className={NAV_LINK} href="#etapes">Comment ça marche</a>
          <Link prefetch={false} className={NAV_LINK} href="/compte">Mon compte</Link>
        </nav>
        <Link prefetch={false} className="btn btn--solid min-h-11 px-5 py-2.5" href="/reserver">
          Réserver
        </Link>
      </header>

      <main id="top">
        {/* ================= HERO ================= */}
        <section className="hero" data-hero>
          <div className="hero__bg" aria-hidden="true">
            <span className="hero__ring hero__ring--1" />
            <span className="hero__ring hero__ring--2" />
            <span className="hero__beam" />
          </div>

          <div className="hero__copy">
            <p className="eyebrow hero__eyebrow">
              {CAR.make} {CAR.model} {CAR.trim} <span>· {CAR.year}</span>
            </p>
            <h1 className="hero__title">
              La nouvelle Ibiza&nbsp;FR.
              <em>Elle est à vous.</em>
            </h1>
            <p className="hero__lead">
              Location et transferts en {SITE.country}. Indiquez votre trajet, découvrez votre prix
              au kilomètre près et réservez en trois étapes.
            </p>
          </div>

          <div className="hero__stage">
            <p className="hero__word" aria-hidden="true">
              IBIZA
            </p>
            <div className="hero__car">
              <Picture
                name="hero-ibiza"
                alt="SEAT Ibiza FR 2026 gris graphite, vue trois quarts avant"
                sizes="(max-width: 767px) 116vw, min(1100px, 70vw)"
                eager
              />
            </div>
            <span className="hero__floor" aria-hidden="true" />
          </div>

          <div className="hero__foot">
            <QuickBook price={price} today={today} />
          </div>
        </section>

        {/* ================= MARQUEE ================= */}
        <div className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {[0, 1].map((k) => (
              <div className="marquee__group" key={k}>
                {MARQUEE.map((w) => (
                  <span key={w}>
                    {w}
                    <i>✦</i>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ================= SHOWROOM (scroll frames) ================= */}
        <section
          className="show"
          id="showroom"
          data-show
          style={{ "--frames": ANGLES.length } as React.CSSProperties}
        >
          <div className="show__stage">
            <div className="show__copy">
              <p className="eyebrow">Tour du propriétaire</p>
              <div className="show__captions">
                {ANGLES.map((a, i) => (
                  <article className={`cap${i === 0 ? " on" : ""}`} data-cap key={a.img}>
                    <p className="cap__k">
                      <b>0{i + 1}</b> / 0{ANGLES.length} — {a.k}
                    </p>
                    <h2 className="cap__title">{a.title}</h2>
                    <p className="cap__text">{a.text}</p>
                  </article>
                ))}
              </div>
              <div className="show__dots" role="tablist" aria-label="Angles de vue">
                {ANGLES.map((a, i) => (
                  <button
                    key={a.img}
                    type="button"
                    role="tab"
                    data-dot={i}
                    aria-label={a.k}
                    aria-selected={i === 0}
                  />
                ))}
              </div>
            </div>

            <div className="frame">
              <div className="frame__view">
                {ANGLES.map((a, i) => (
                  <div
                    className="frame__layer"
                    data-layer
                    data-zoom={a.img}
                    data-zoom-caption={`${a.k} — ${a.title}`}
                    key={a.img}
                    style={{ clipPath: i === 0 ? "none" : "inset(0 0 0 100%)" }}
                  >
                    <Picture
                      name={a.img}
                      alt={`SEAT Ibiza FR — ${a.k.toLowerCase()}`}
                      sizes="(max-width: 900px) 92vw, 58vw"
                    />
                  </div>
                ))}
                <span className="frame__shade" aria-hidden="true" />
              </div>
              <span className="frame__corner frame__corner--tl" aria-hidden="true" />
              <span className="frame__corner frame__corner--tr" aria-hidden="true" />
              <span className="frame__corner frame__corner--bl" aria-hidden="true" />
              <span className="frame__corner frame__corner--br" aria-hidden="true" />
              <div className="frame__meta" aria-hidden="true">
                <span>
                  <i className="frame__rec" /> IBIZA FR
                </span>
                <span className="frame__bar">
                  <b data-bar />
                </span>
                <span data-count-frame>01</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= STATS ================= */}
        <section className="wrap grid items-end gap-[clamp(2rem,5vw,5rem)] border-y border-line bg-linear-to-br from-deep to-[#03363a] py-[clamp(3.5rem,9vw,7rem)] lg:grid-cols-[1.25fr_1fr]">
          <p
            className="font-display text-[clamp(1.3rem,3vw,2.3rem)] leading-[1.22] font-medium tracking-tight"
            data-reveal
          >
            Une citadine au caractère <em className="text-sand not-italic">sportif</em>, pensée pour
            la ville, taillée pour la route des vacances.
          </p>
          <ul className="grid grid-cols-2 gap-x-[clamp(1.2rem,3vw,2.4rem)] gap-y-6">
            {STATS.map((s, i) => (
              <li key={s.label} data-reveal style={delay(i * 80)}>
                <strong className="block font-display text-[clamp(1.9rem,4vw,2.9rem)] leading-none font-extrabold tabular-nums">
                  <span data-count={s.value}>{s.value}</span>
                  {s.unit}
                </strong>
                <span className="mt-1.5 block text-[0.84rem] text-aqua">{s.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ================= INTERIOR ================= */}
        <section className={SECTION} id="interieur">
          <header
            className="mb-[clamp(2rem,5vw,3.5rem)] flex flex-wrap items-end justify-between gap-x-8 gap-y-5"
            data-reveal
          >
            <div>
              <p className="eyebrow">À bord</p>
              <h2 className={TITLE}>
                Un cockpit qui donne
                <br />
                envie de rouler.
              </h2>
            </div>
            <p className="max-w-[36ch] text-mist">
              Finition FR : surpiqûres rouges, écrans haute définition et tout le confort d&apos;une
              grande.
            </p>
          </header>

          <div className="grid grid-cols-12 gap-[clamp(0.7rem,1.4vw,1.2rem)]">
            {INTERIOR.map((s, i) => (
              <figure
                className={`group relative col-span-12 aspect-[4/3] bg-night-2 ${CARD} ${s.span} [&_picture]:absolute [&_picture]:inset-0`}
                key={s.img}
                data-reveal
                data-zoom={s.img}
                data-zoom-caption={`${s.k} — ${s.title}`}
                style={delay((i % 3) * 90)}
              >
                <Picture
                  name={s.img}
                  alt={`${s.k} — ${s.title}`}
                  sizes={s.sizes}
                  className="h-full w-full object-cover transition-transform duration-1200 ease-expo group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-45% to-[#021416]/90" />
                <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-6 py-5">
                  <span className="text-[0.66rem] font-semibold tracking-[0.26em] text-aqua uppercase">
                    {s.k}
                  </span>
                  <span className="font-display text-[clamp(0.95rem,1.5vw,1.2rem)] leading-tight font-medium">
                    {s.title}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          <figure
            className={`group relative mt-[clamp(0.7rem,1.4vw,1.2rem)] aspect-[3.1/1] min-h-60 w-full ${CARD} [&_picture]:absolute [&_picture]:inset-0`}
            data-reveal
            data-zoom="int-ambient"
            data-zoom-caption="Éclairage d'ambiance — l'habitacle après le coucher du soleil"
          >
            <Picture
              name="int-ambient"
              alt="Éclairage d'ambiance rouge dans l'habitacle de l'Ibiza FR"
              sizes="(max-width: 767px) 170vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-1200 ease-expo group-hover:scale-105"
            />
            <span className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#021416]/85 to-transparent to-60%" />
            <figcaption className="absolute inset-y-0 left-0 flex max-w-[560px] flex-col justify-center gap-3 p-[clamp(1.3rem,4vw,3.4rem)]">
              <span className="eyebrow">Après le coucher du soleil</span>
              <span className="font-display text-[clamp(1.2rem,3vw,2.2rem)] leading-[1.12] font-medium tracking-tight">
                L&apos;ambiance change. Le plaisir reste.
              </span>
            </figcaption>
          </figure>
        </section>

        {/* ================= FEATURES ================= */}
        <section
          className={`${SECTION} border-t border-hair bg-linear-to-b from-night-2 to-night`}
          id="equipements"
        >
          <div className="grid items-center gap-[clamp(2rem,6vw,5.5rem)] lg:grid-cols-[0.9fr_1fr]">
            <div className="relative max-w-[560px] pb-[16%] lg:max-w-none">
              <figure
                className={`relative aspect-[5/4] w-[84%] border-line shadow-[0_40px_70px_-40px_#000] ${CARD} [&_picture]:contents`}
                data-reveal
                data-zoom="ext-grille"
                data-zoom-caption="Calandre et signature lumineuse Full LED"
              >
                <Picture
                  name="ext-grille"
                  alt="Calandre et phare LED de l'Ibiza FR"
                  sizes="(max-width: 1023px) 70vw, 34vw"
                  className="h-full w-full object-cover"
                />
              </figure>
              <figure
                className={`absolute right-0 bottom-0 aspect-[4/3] w-[52%] border-line shadow-[0_40px_70px_-40px_#000] outline-8 outline-night-2 ${CARD} [&_picture]:contents`}
                data-reveal
                data-zoom="int-seat"
                data-zoom-caption="Sièges sport de la finition FR"
                style={delay(120)}
              >
                <Picture
                  name="int-seat"
                  alt="Siège sport de l'Ibiza FR"
                  sizes="(max-width: 1023px) 46vw, 22vw"
                  className="h-full w-full object-cover"
                />
              </figure>
            </div>

            <div>
              <header data-reveal>
                <p className="eyebrow">Équipements</p>
                <h2 className={TITLE}>Tout est inclus. Même le sourire.</h2>
              </header>
              <ul className="mt-8 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {FEATURES.map((f, i) => (
                  <li
                    className="flex gap-3.5 border-t border-hair py-4.5"
                    key={f.title}
                    data-reveal
                    style={delay(i * 60)}
                  >
                    <span className="grid size-[42px] shrink-0 place-items-center rounded-xl border border-line bg-teal/15 text-aqua">
                      <Icon name={f.icon} />
                    </span>
                    <div>
                      <h3 className="font-body text-[0.98rem] leading-snug font-semibold tracking-normal">
                        {f.title}
                      </h3>
                      <p className="mt-1 text-[0.88rem] text-mist">{f.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ================= TRANSFER ================= */}
        <section className="wrap border-y border-line bg-linear-to-br from-deep to-[#03363a] py-[clamp(4rem,9vw,7rem)]" id="transfert">
          <div className="grid items-center gap-[clamp(2rem,6vw,5rem)] lg:grid-cols-2">
            <div data-reveal>
              <p className="eyebrow">Transfert</p>
              <h2 className={TITLE}>Vous payez la route. Pas un kilomètre de plus.</h2>
              <p className="mt-5 max-w-[46ch] text-mist">
                Aéroport, hôtel, mariage ou rendez-vous : indiquez le départ et la destination, la carte
                trace l&apos;itinéraire et calcule le prix exact avant que vous ne réserviez.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link prefetch={false} className="btn btn--solid" href="/reserver?mode=transfert">
                  Calculer mon trajet <Icon name="arrow" size={18} />
                </Link>
                {perKm > 0 && (
                  <p className="text-sm text-mist">
                    <b className="font-display text-xl font-extrabold text-sand">{money(perKm, currency)}</b> / km
                  </p>
                )}
              </div>
            </div>

            <div className={`relative bg-night/60 p-[clamp(1.2rem,3vw,2rem)] ${CARD} border-line`} data-reveal style={delay(120)}>
              <svg viewBox="0 0 400 190" className="w-full" role="img" aria-label="Itinéraire tracé entre un point de départ A et une destination B">
                <defs>
                  <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M28 0H0V28" fill="none" stroke="rgb(255 255 255 / 0.06)" />
                  </pattern>
                </defs>
                <rect width="400" height="190" rx="14" fill="url(#grid)" />
                <path d="M46 150C110 150 96 78 160 84s62 66 118 40 40-70 78-84" fill="none" stroke="#021a1c" strokeWidth="11" strokeLinecap="round" />
                <path className="route-line" d="M46 150C110 150 96 78 160 84s62 66 118 40 40-70 78-84" fill="none" stroke="#86cfcf" strokeWidth="4.5" strokeLinecap="round" pathLength="1" />
                <circle cx="46" cy="150" r="13" fill="#86cfcf" stroke="#021a1c" strokeWidth="3" />
                <circle cx="356" cy="40" r="13" fill="#ffe4d3" stroke="#021a1c" strokeWidth="3" />
                <text x="46" y="154.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#02211f">A</text>
                <text x="356" y="44.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#02211f">B</text>
              </svg>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-hair pt-5 text-center">
                {[
                  ["Distance", "calculée sur la route réelle"],
                  ["Durée", "estimée avant le départ"],
                  ["Prix", "fixé à la réservation"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-display text-sm font-extrabold text-ink">{k}</dt>
                    <dd className="mt-1 text-xs text-mist">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ================= STEPS ================= */}
        <section className={SECTION} id="etapes">
          <header
            className="mb-[clamp(2rem,5vw,3.5rem)] flex flex-col items-center text-center"
            data-reveal
          >
            <p className="eyebrow">Comment ça marche</p>
            <h2 className={TITLE}>Trois étapes. Zéro paperasse inutile.</h2>
          </header>
          <ol className="grid gap-[clamp(0.8rem,1.6vw,1.4rem)] md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} data-reveal style={delay(i * 110)}>
                <div
                  className={`h-full bg-linear-to-br from-deep/55 to-night-2/40 p-[clamp(1.5rem,3vw,2.2rem)] transition duration-400 ease-soft hover:-translate-y-1 hover:border-teal ${CARD}`}
                >
                  <span className="block font-display text-[2.6rem] leading-none font-extrabold text-transparent [-webkit-text-stroke:1px_var(--color-teal)]">
                    0{i + 1}
                  </span>
                  <h3 className="mt-6 text-[1.08rem]">{s.title}</h3>
                  <p className="mt-2.5 text-[0.93rem] text-mist">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ================= BOOKING ================= */}
        <section
          className="wrap border-t border-line bg-[radial-gradient(60%_80%_at_0%_100%,rgb(76_156_157/0.22),transparent_70%),linear-gradient(135deg,var(--color-deep),var(--color-night)_70%)] py-[clamp(4rem,9vw,8rem)]"
          id="reserver"
        >
          <header className="max-w-2xl" data-reveal>
            <p className="eyebrow">Réservation</p>
            <h2 className={TITLE}>Votre Ibiza FR vous attend.</h2>
            <p className="mt-4.5 text-mist">Deux façons de rouler avec nous. Dans les deux cas, le prix est affiché avant de confirmer.</p>
          </header>

          <div className="mt-10 grid gap-[clamp(0.8rem,1.6vw,1.4rem)] md:grid-cols-2">
            {[
              {
                href: "/reserver?mode=transfert",
                k: "Transfert",
                title: "Avec chauffeur, au kilomètre",
                text: "De l'aéroport à l'hôtel ou d'une ville à l'autre. Itinéraire et prix calculés sur la carte.",
                price: perKm > 0 ? `${money(perKm, currency)} / km` : "Prix calculé en ligne",
              },
              {
                href: "/reserver?mode=location",
                k: "Location",
                title: "Vous prenez le volant",
                text: "À la journée, au week-end ou au mois. Choisissez vos dates et le lieu de prise en charge.",
                price: Number.isFinite(perDay) ? `Dès ${money(perDay, currency)} / jour` : "Prix calculé en ligne",
              },
            ].map((o, i) => (
              <Link prefetch={false}
                key={o.k}
                href={o.href}
                className={`group flex flex-col bg-night/60 p-[clamp(1.4rem,3vw,2.2rem)] transition duration-400 ease-soft hover:-translate-y-1 hover:border-teal ${CARD} border-line`}
                data-reveal
                style={delay(i * 110)}
              >
                <span className="eyebrow">{o.k}</span>
                <span className="mt-3 font-display text-[clamp(1.2rem,2.4vw,1.7rem)] leading-tight font-medium">{o.title}</span>
                <span className="mt-3 text-mist">{o.text}</span>
                <span className="mt-8 flex items-center justify-between gap-4 border-t border-hair pt-5">
                  <span className="font-display text-lg font-extrabold text-sand">{o.price}</span>
                  <span className="grid size-11 place-items-center rounded-full bg-linear-to-br from-aqua to-teal text-[#02211f] transition-transform group-hover:translate-x-1">
                    <Icon name="arrow" size={18} />
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {(phone || whatsapp) && (
            <ul className="mt-8 flex flex-wrap items-center gap-2.5" data-reveal>
              <li className="mr-2 text-sm text-mist">Vous préférez nous parler ?</li>
              {phone && (
                <li>
                  <a className={PILL} href={`tel:${tel}`}>
                    <Icon name="phone" size={18} /> {phone}
                  </a>
                </li>
              )}
              {whatsapp && (
                <li>
                  <a className={PILL} href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                    <Icon name="chat" size={18} /> WhatsApp
                  </a>
                </li>
              )}
            </ul>
          )}
        </section>
      </main>

      <footer className="wrap flex flex-wrap items-center justify-between gap-x-8 gap-y-5 border-t border-hair py-9 text-[0.86rem] text-mist">
        <div className="flex flex-col leading-none text-ink">
          <span className={LOGO}>{SITE.brand}</span>
          <span className={LOGO_SUB}>{SITE.brandSub}</span>
        </div>
        <p className="flex flex-wrap gap-x-6 gap-y-1.5">
          <Link prefetch={false} className="inline-flex min-h-11 items-center hover:text-aqua" href="/reserver">
            Réserver
          </Link>
          <Link prefetch={false} className="inline-flex min-h-11 items-center hover:text-aqua" href="/compte">
            Mon compte
          </Link>
          {phone && (
            <a className="inline-flex min-h-11 items-center hover:text-aqua" href={`tel:${tel}`}>
              {phone}
            </a>
          )}
          {email && (
            <a className="inline-flex min-h-11 items-center hover:text-aqua" href={`mailto:${email}`}>
              {email}
            </a>
          )}
        </p>
        <p className="text-fog">
          © {new Date().getFullYear()} {SITE.brand} {SITE.brandSub} — {SITE.country}
        </p>
      </footer>

      <Lightbox />
      <BottomNav />
    </>
  );
}
