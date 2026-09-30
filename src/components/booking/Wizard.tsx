"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bookAction } from "@/app/actions/booking";
import Icon from "@/components/Icon";
import Picture from "@/components/Picture";
import { FIELD, INPUT, LABEL, Notice, PANEL } from "@/components/ui";
import { carName, duration, money } from "@/lib/format";
import type { Car, Kind, Place, Point, Price, Route, User } from "@/lib/types";
import { messageToAgency, waLink } from "@/lib/whatsapp";
import DateTimeField from "../pickers/DateTimeField";
import PlaceInput from "./PlaceInput";

const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-fog">Chargement de la carte…</div>,
});

type Offer = { carId: number; price: Price; available: boolean };
type Quote = { route: Route | null; currency: string; offers: Offer[] };
type Done = { reference: string; total: number; currency: string };

type Props = {
  cars: Car[];
  places: Place[];
  user: Pick<User, "full_name" | "phone"> | null;
  currency: string;
  minLeadHours: number;
  whatsapp: string;
  initial: { kind: Kind; startAt: string; endAt: string };
};

const STEPS = ["Trajet", "Véhicule", "Coordonnées"];

const pad = (n: number) => String(n).padStart(2, "0");
const localInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function Wizard({ cars, places, user, currency, minLeadHours, whatsapp, initial }: Props) {
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [step, setStep] = useState(0);
  const [pickup, setPickup] = useState<Point | null>(null);
  const [dropoff, setDropoff] = useState<Point | null>(null);
  const [target, setTarget] = useState<"pickup" | "dropoff">("pickup");
  const [roundTrip, setRoundTrip] = useState(false);
  const [startAt, setStartAt] = useState(initial.startAt);
  const [endAt, setEndAt] = useState(initial.endAt);
  const [passengers, setPassengers] = useState(1);
  const [carId, setCarId] = useState<number | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const top = useRef<HTMLDivElement>(null);

  const isTransfer = kind === "transfer";
  const minStart = useMemo(() => localInput(new Date(Date.now() + minLeadHours * 3_600_000 + 300_000)), [minLeadHours]);
  const ready = isTransfer ? Boolean(pickup && dropoff) : Boolean(pickup && startAt && endAt);

  const trip = useMemo(
    () => ({ kind, pickup, dropoff: isTransfer ? dropoff : null, roundTrip, startAt, endAt }),
    [kind, pickup, dropoff, isTransfer, roundTrip, startAt, endAt],
  );

  /* live price: recomputed by the server every time the trip changes */
  useEffect(() => {
    setError("");
    if (!ready) {
      setQuote(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trip),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setQuote(null);
          setError(data.error ?? "Calcul impossible.");
        } else setQuote(data as Quote);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Connexion perdue. Vérifiez votre réseau.");
      } finally {
        if (!ctrl.signal.aborted) setQuoting(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [trip, ready]);

  const offers = quote?.offers ?? [];
  const offerOf = (id: number | null) => offers.find((o) => o.carId === id);
  const best = useMemo(
    () => offers.filter((o) => o.available).sort((a, b) => a.price.total - b.price.total)[0],
    [offers],
  );
  const chosen = offerOf(carId)?.available ? offerOf(carId) : undefined;
  const shown = chosen ?? best;
  const car = cars.find((c) => c.id === (chosen?.carId ?? null));
  // a price exists but every vehicle is taken at that time: say so at once, not two steps later
  const noService = Boolean(quote) && offers.length === 0;
  const soldOut = noService || (offers.length > 0 && !best);
  const SOLD_OUT = noService
    ? `La réservation en ligne n'est pas encore ouverte pour ${isTransfer ? "les transferts" : "la location"}. Contactez-nous pour un devis.`
    : "Aucun véhicule n'est disponible à cette date. Essayez un autre horaire.";

  // keep a valid car selected as offers change
  useEffect(() => {
    if (!offers.length) return;
    if (!offerOf(carId)?.available) setCarId(best?.carId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers]);

  const onMapPick = useCallback(
    async (lat: number, lng: number) => {
      const field = !pickup ? "pickup" : isTransfer && !dropoff ? "dropoff" : isTransfer ? target : "pickup";
      try {
        const res = await fetch(`/api/geo/search?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`);
        const data = await res.json();
        if (!res.ok) return setError(data.error ?? "Point invalide.");
        if (field === "pickup") setPickup(data.place);
        else setDropoff(data.place);
      } catch {
        setError("Connexion perdue. Vérifiez votre réseau.");
      }
    },
    [pickup, dropoff, isTransfer, target],
  );

  const quick = (p: Place) => {
    const point = { label: p.name, lat: p.lat, lng: p.lng };
    if (!pickup || (!isTransfer && pickup)) setPickup(point);
    else if (!dropoff) setDropoff(point);
    else if (target === "pickup") setPickup(point);
    else setDropoff(point);
  };

  const go = (n: number) => {
    setError("");
    setStep(n);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const next = () => {
    if (step === 0) {
      if (!pickup) return setError("Choisissez votre lieu de départ.");
      if (isTransfer && !dropoff) return setError("Choisissez votre destination.");
      if (!startAt) return setError("Indiquez la date et l'heure de départ.");
      if (!isTransfer && !endAt) return setError("Indiquez la date de retour.");
      if (!quote) return setError(error || "Le calcul du prix est en cours, un instant…");
      if (soldOut) return setError(SOLD_OUT);
    }
    if (step === 1 && !chosen) return setError("Choisissez un véhicule disponible.");
    go(step + 1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen || sending) return;
    setSending(true);
    setError("");
    const result = await bookAction(
      { ...trip, carId: chosen.carId, passengers, customerName: name, customerPhone: phone, note },
      user ? undefined : { mode, name, email, phone, password },
    );
    setSending(false);
    if (!result.ok) return setError(result.error);
    setDone(result);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (done) {
    return (
      <div ref={top} className={`${PANEL} mx-auto max-w-2xl text-center`}>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-teal text-3xl font-bold text-[#02211f]">✓</span>
        <h1 className="mt-6 text-[clamp(1.5rem,4vw,2.3rem)]">Demande envoyée.</h1>
        <p className="mt-3 text-mist">
          Nous vous contactons rapidement pour confirmer. Conservez votre référence :
        </p>
        <p className="mt-5 font-display text-3xl font-extrabold tracking-[0.12em] text-sand">{done.reference}</p>
        <p className="mt-2 text-mist">
          Montant : <b className="text-ink">{money(done.total, done.currency)}</b>
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link prefetch={false} className="btn btn--solid" href="/compte">
            Suivre ma réservation <Icon name="arrow" size={18} />
          </Link>
          {whatsapp && (
            <a
              className="btn btn--ghost"
              href={waLink(whatsapp, messageToAgency({ reference: done.reference, customer_name: name || user?.full_name || "" }))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="chat" size={18} /> Prévenir sur WhatsApp
            </a>
          )}
        </div>
        <p className="mt-6 text-xs text-fog">Vous serez averti ici, dans votre compte, dès que la réservation est confirmée.</p>
      </div>
    );
  }

  return (
    /* Phone order: type → map → steps → form → price detail, with the action bar pinned
       under the thumb. From 1024px the two wrappers become real columns. */
    <div ref={top} className="grid scroll-mt-20 grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-5">
      {/* ---------------- steps ---------------- */}
      <div className="contents lg:flex lg:flex-col lg:gap-4">
        <div className="order-1 flex gap-1.5 rounded-full border border-line bg-night-2/70 p-1.5 lg:order-none" role="tablist" aria-label="Type de réservation">
          {(["transfer", "rental"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              className={`min-h-11 flex-1 cursor-pointer rounded-full px-3 py-2 text-sm font-semibold transition-colors ${kind === k ? "bg-linear-to-br from-aqua to-teal text-[#02211f]" : "text-mist hover:text-ink"}`}
              onClick={() => {
                setKind(k);
                setStep(0);
                setQuote(null);
              }}
            >
              {k === "transfer" ? "Transfert" : "Location"}
              <span className="font-normal opacity-75 max-[400px]:hidden">{k === "transfer" ? " · au km" : " · à la journée"}</span>
            </button>
          ))}
        </div>

        <ol className="order-3 flex items-center gap-2 px-1 text-sm lg:order-none">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={i > step}
                aria-current={i === step ? "step" : undefined}
                className={`flex min-h-11 min-w-11 items-center gap-2 disabled:cursor-default ${i < step ? "cursor-pointer" : ""}`}
                onClick={() => i < step && go(i)}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full text-xs font-bold ${i < step ? "bg-teal text-[#02211f]" : i === step ? "bg-aqua text-[#02211f]" : "border border-line text-fog"}`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={i === step ? "font-semibold text-ink" : "text-mist max-sm:hidden"}>{s}</span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
            </li>
          ))}
        </ol>

        <form className={`${PANEL} order-4 flex flex-col gap-4 lg:order-none`} onSubmit={submit} noValidate>
          {step === 0 && (
            <>
              <h1 className="text-[clamp(1.3rem,3vw,1.8rem)]">
                {isTransfer ? "Où allez-vous ?" : "Quand et où prenez-vous la voiture ?"}
              </h1>
              <PlaceInput
                label={isTransfer ? "Départ" : "Lieu de prise en charge"}
                badge="A"
                value={pickup}
                placeholder="Adresse, hôtel, aéroport…"
                onChange={setPickup}
                onFocus={() => setTarget("pickup")}
              />
              {isTransfer && (
                <>
                  <div className="-my-3 flex justify-center">
                    <button
                      type="button"
                      className="min-h-11 cursor-pointer rounded-full border border-line bg-night-2 px-4 text-sm text-mist hover:border-aqua hover:text-ink"
                      onClick={() => {
                        setPickup(dropoff);
                        setDropoff(pickup);
                      }}
                    >
                      ⇅ Inverser
                    </button>
                  </div>
                  <PlaceInput
                    label="Destination"
                    badge="B"
                    value={dropoff}
                    placeholder="Où souhaitez-vous aller ?"
                    onChange={setDropoff}
                    onFocus={() => setTarget("dropoff")}
                  />
                </>
              )}

              {places.length > 0 && (
                <div>
                  <p className={LABEL}>Lieux fréquents</p>
                  {/* one swipeable row on phones, wrapping from 1024px */}
                  <div className="-mx-[clamp(1.1rem,2.6vw,1.8rem)] mt-2 flex snap-x gap-2 overflow-x-auto px-[clamp(1.1rem,2.6vw,1.8rem)] pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden">
                    {places.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="min-h-11 shrink-0 cursor-pointer snap-start rounded-full border border-hair bg-white/5 px-4 text-sm whitespace-nowrap text-mist transition-colors hover:border-aqua hover:text-ink active:bg-aqua/15"
                        onClick={() => quick(p)}
                      >
                        {p.kind === "airport" ? "✈ " : p.kind === "port" ? "⚓ " : ""}
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-fog">Vous pouvez aussi toucher la carte pour placer un point.</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <DateTimeField
                  label={isTransfer ? "Date et heure de départ" : "Départ"}
                  value={startAt}
                  min={minStart}
                  onChange={(v) => {
                    setStartAt(v);
                    // a return that now comes before the departure is no longer valid
                    if (endAt && endAt <= v) setEndAt("");
                  }}
                />
                {isTransfer ? (
                  <label className="flex min-h-13 cursor-pointer items-center justify-between gap-3 self-end rounded-xl border border-hair bg-white/5 px-4 py-3 transition-colors has-checked:border-aqua/50 has-checked:bg-aqua/10">
                    <span>
                      <span className="block text-sm font-semibold">Aller-retour</span>
                      <span className="block text-xs text-fog">{roundTrip ? "Retour au point de départ inclus" : "Aller simple"}</span>
                    </span>
                    <input type="checkbox" className="peer sr-only" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
                    <span
                      className="relative h-7 w-12 shrink-0 rounded-full bg-white/15 transition-colors peer-checked:bg-teal peer-focus-visible:ring-2 peer-focus-visible:ring-aqua after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-300 peer-checked:after:translate-x-5"
                      aria-hidden="true"
                    />
                  </label>
                ) : (
                  <DateTimeField label="Retour" value={endAt} min={startAt || minStart} rangeStart={startAt ? startAt.slice(0, 10) : undefined} onChange={setEndAt} />
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-[clamp(1.3rem,3vw,1.8rem)]">Choisissez votre véhicule</h1>
              <ul className="flex flex-col gap-3">
                {offers.map((o) => {
                  const c = cars.find((x) => x.id === o.carId);
                  if (!c) return null;
                  const on = carId === c.id && o.available;
                  return (
                    <li key={c.id}>
                      {/* photo + name on the first row, price on its own row below: nothing competes for width on a 320px screen */}
                      <button
                        type="button"
                        disabled={!o.available}
                        aria-pressed={on}
                        className={`grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 ${on ? "border-aqua bg-aqua/10" : "border-hair bg-white/[0.03] hover:border-line"}`}
                        onClick={() => setCarId(c.id)}
                      >
                        <span className="grid h-16 w-24 place-items-center overflow-hidden rounded-xl bg-linear-to-br from-deep to-night sm:h-20 sm:w-32">
                          {c.image ? (
                            <Picture name={c.image} alt="" sizes="128px" className="w-full object-contain" />
                          ) : (
                            <span className="font-display text-xs text-fog">{c.make}</span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-base leading-tight font-medium">{carName(c)}</span>
                          <span className="mt-1 block text-xs text-mist">
                            {c.seats} places · {c.luggage} bagages ·{" "}
                            {c.transmission === "automatic" ? "Automatique" : "Manuelle"}
                          </span>
                          {!o.available && <span className="mt-1 block text-xs text-[#f5b39a]">Indisponible à ces dates</span>}
                        </span>
                        <span className="flex items-baseline justify-between gap-3 max-sm:col-span-2 max-sm:border-t max-sm:border-hair max-sm:pt-3 sm:block sm:text-right">
                          <span className="text-xs text-fog sm:hidden">
                            {money(o.price.unitPrice, currency)} / {isTransfer ? "km" : "jour"}
                          </span>
                          <span className="block font-display text-lg font-extrabold whitespace-nowrap text-sand">
                            {money(o.price.total, currency)}
                          </span>
                          <span className="block text-xs text-fog max-sm:hidden">
                            {money(o.price.unitPrice, currency)} / {isTransfer ? "km" : "jour"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {offers.length === 0 && <Notice tone="error">Aucun véhicule n&apos;est proposé pour ce type de réservation.</Notice>}
              <label className={`${FIELD} max-w-44`}>
                <span className={LABEL}>Passagers</span>
                <input
                  className={INPUT}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={(car?.seats ?? 5) - (isTransfer ? 1 : 0)}
                  value={passengers}
                  onChange={(e) => setPassengers(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-[clamp(1.3rem,3vw,1.8rem)]">
                {user ? "Confirmez vos coordonnées" : "Dernière étape : vos coordonnées"}
              </h1>
              {!user && (
                <div className="flex gap-1.5 rounded-full border border-hair p-1" role="tablist">
                  {(["signup", "login"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      className={`min-h-11 flex-1 cursor-pointer rounded-full px-3 py-2 text-sm font-semibold ${mode === m ? "bg-white/10 text-ink" : "text-mist"}`}
                      onClick={() => setMode(m)}
                    >
                      {m === "signup" ? "Je suis nouveau" : "J'ai déjà un compte"}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {(user || mode === "signup") && (
                  <>
                    <label className={FIELD}>
                      <span className={LABEL}>Nom complet</span>
                      <input className={INPUT} value={name} maxLength={80} autoComplete="name" required onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label className={FIELD}>
                      <span className={LABEL}>Téléphone</span>
                      <input className={INPUT} value={phone} maxLength={24} type="tel" inputMode="tel" autoComplete="tel" required onChange={(e) => setPhone(e.target.value)} />
                    </label>
                  </>
                )}
                {!user && (
                  <>
                    <label className={FIELD}>
                      <span className={LABEL}>E-mail</span>
                      <input className={INPUT} value={email} maxLength={160} type="email" autoComplete="email" required onChange={(e) => setEmail(e.target.value)} />
                    </label>
                    <label className={FIELD}>
                      <span className={LABEL}>{mode === "signup" ? "Créez un mot de passe" : "Mot de passe"}</span>
                      <input
                        className={INPUT}
                        value={password}
                        maxLength={200}
                        minLength={8}
                        type="password"
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        required
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </label>
                  </>
                )}
                <label className={`${FIELD} sm:col-span-2`}>
                  <span className={LABEL}>Précisions (facultatif)</span>
                  <textarea className={`${INPUT} resize-y`} rows={2} maxLength={500} placeholder="Numéro de vol, bagages, siège enfant…" value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
              </div>
              {!user && mode === "signup" && (
                <p className="text-xs text-fog">Votre compte est créé en même temps que la réservation, pour la suivre en ligne.</p>
              )}
            </>
          )}

          {/* Action bar: pinned to the bottom of the screen on phones, inline from 1024px */}
          <div className="flex flex-col gap-2.5 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:border-t max-lg:border-line max-lg:bg-night/95 max-lg:pt-3 max-lg:pr-[max(1rem,env(safe-area-inset-right))] max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-lg:pl-[max(1rem,env(safe-area-inset-left))] max-lg:shadow-[0_-20px_40px_-20px_#000] max-lg:backdrop-blur-xl">
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {step > 0 && (
                <button type="button" className="btn btn--ghost max-lg:size-12 max-lg:shrink-0 max-lg:p-0 max-[359px]:size-11" onClick={() => go(step - 1)} aria-label="Étape précédente">
                  <span className="lg:hidden">
                    <Icon name="back" size={20} />
                  </span>
                  <span className="max-lg:hidden">Retour</span>
                </button>
              )}
              <p className="min-w-0 flex-1 leading-tight lg:invisible" aria-hidden="true">
                {shown ? (
                  <>
                    <span className="block truncate text-[0.7rem] text-mist">
                      {isTransfer && quote?.route
                        ? `${(quote.route.km * (roundTrip ? 2 : 1)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km · ${duration(quote.route.minutes * (roundTrip ? 2 : 1))}`
                        : chosen
                          ? "Total"
                          : "À partir de"}
                    </span>
                    <span className={`block font-display text-[clamp(0.95rem,5vw,1.25rem)] font-extrabold whitespace-nowrap text-sand tabular-nums transition-opacity ${quoting ? "opacity-40" : ""}`}>
                      {money(shown.price.total, currency)}
                    </span>
                  </>
                ) : (
                  <span className={`block text-xs ${soldOut ? "text-[#f5b39a]" : "text-mist"}`}>
                    {quoting ? "Calcul…" : noService ? "Sur devis" : soldOut ? "Indisponible à cette date" : "Votre prix s'affiche ici"}
                  </span>
                )}
              </p>
              {step < 2 ? (
                <button key="next" type="button" className="btn btn--solid min-h-12 shrink-0 max-[379px]:px-4" onClick={next}>
                  Continuer
                  <span className="max-[379px]:hidden">
                    <Icon name="arrow" size={18} />
                  </span>
                </button>
              ) : (
                <button key="confirm" type="submit" className="btn btn--solid min-h-12 shrink-0 max-[379px]:px-4" disabled={sending || !chosen}>
                  {sending ? "Envoi…" : "Confirmer"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* ---------------- map + live price ---------------- */}
      <aside className="contents lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-4">
        {/* on phones the map leads step 1, then steps aside so the form has the screen */}
        <div
          className={`relative order-2 h-[clamp(170px,30svh,280px)] overflow-hidden rounded-3xl border border-line lg:order-none lg:h-[clamp(240px,42vh,440px)] ${step > 0 ? "max-lg:hidden" : ""}`}
        >
          <RouteMap pickup={pickup} dropoff={isTransfer ? dropoff : null} polyline={isTransfer ? (quote?.route?.polyline ?? "") : ""} onPick={onMapPick} />
        </div>

        <div className={`${PANEL} order-5 lg:order-none`} aria-live="polite">
          {isTransfer && (
            <dl className="grid grid-cols-2 gap-3 border-b border-hair pb-4">
              <div>
                <dt className={LABEL}>Distance</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums">
                  {quote?.route ? `${(quote.route.km * (roundTrip ? 2 : 1)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km` : "—"}
                </dd>
              </div>
              <div>
                <dt className={LABEL}>Durée estimée</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums">
                  {quote?.route ? duration(quote.route.minutes * (roundTrip ? 2 : 1)) : "—"}
                </dd>
              </div>
            </dl>
          )}

          {shown ? (
            <>
              <ul className={`flex flex-col gap-1.5 text-sm ${isTransfer ? "pt-4" : ""}`}>
                {shown.price.lines.map((l) => (
                  <li key={l.label} className="flex justify-between gap-4 text-mist">
                    <span>{l.label}</span>
                    <span className="tabular-nums">{money(l.amount, currency)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-end justify-between gap-4 border-t border-hair pt-4">
                <span className="text-sm text-mist">{chosen ? "Total" : "À partir de"}</span>
                <span className={`font-display text-3xl font-extrabold text-sand tabular-nums transition-opacity ${quoting ? "opacity-40" : ""}`}>
                  {money(shown.price.total, currency)}
                </span>
              </p>
            </>
          ) : (
            <p className={`text-sm text-mist ${isTransfer ? "pt-4" : ""}`}>
              {quoting
                ? "Calcul de l'itinéraire…"
                : soldOut
                  ? SOLD_OUT
                  : isTransfer
                  ? "Indiquez le départ et la destination : le prix s'affiche instantanément."
                  : "Indiquez le lieu et les dates : le prix s'affiche instantanément."}
            </p>
          )}
        </div>
      </aside>
      <div className="order-6 h-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
    </div>
  );
}
