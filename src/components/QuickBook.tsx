"use client";

import { useRef, useState } from "react";
import { addDays, daysBetween, fromYmd, shortDate, ymd } from "@/lib/dates";
import { money } from "@/lib/format";
import Calendar from "./pickers/Calendar";
import Popover from "./pickers/Popover";
import Icon from "./Icon";

type Mode = "transfert" | "location";
type Place = { id: number; name: string; kind: string };
type Props = { today: string; places: Place[]; perKm: number; perDay: number; currency: string };

const KIND: Record<string, { icon: string; group: string }> = {
  airport: { icon: "✈", group: "Aéroports" },
  port: { icon: "⚓", group: "Ports" },
  agency: { icon: "◆", group: "Agences" },
  hotel: { icon: "★", group: "Hôtels" },
  city: { icon: "●", group: "Villes" },
};

/* A field of the bar: icon tile, small caption, value. */
function Cell({
  icon,
  label,
  children,
  active,
  onClick,
  className = "",
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={active}
      onClick={onClick}
      className={`group relative flex min-h-16 min-w-0 cursor-pointer items-center gap-3 rounded-2xl px-3 text-left transition-colors ${active ? "bg-aqua/12 ring-1 ring-aqua/50" : "hover:bg-white/[0.06]"} ${className}`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors ${active ? "bg-aqua text-[#02211f]" : "bg-aqua/10 text-aqua group-hover:bg-aqua/20"}`}
      >
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.64rem] font-semibold tracking-[0.18em] text-aqua/90 uppercase">{label}</span>
        {children}
      </span>
    </button>
  );
}

/* Hero booking bar. Posts a plain GET form to /reserver, which opens with everything pre-filled. */
export default function QuickBook({ today, places, perKm, perDay, currency }: Props) {
  const [mode, setMode] = useState<Mode>("transfert");
  const [a, setA] = useState<Place | null>(null);
  const [b, setB] = useState<Place | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<null | "a" | "b" | "from" | "to">(null);
  const where = useRef<HTMLDivElement>(null);
  const when = useRef<HTMLDivElement>(null);
  const range = mode === "location";
  const days = from && to ? daysBetween(from, to) : 0;
  const toggle = (k: NonNullable<typeof open>) => setOpen(open === k ? null : k);

  const value = (text: string | null | undefined, empty: string) =>
    text ? (
      <span className="block truncate text-[1rem] font-semibold text-ink first-letter:uppercase">{text}</span>
    ) : (
      <span className="block truncate text-[0.98rem] text-ink/55">{empty}</span>
    );

  /* ---------- places ---------- */
  const choosePlace = (p: Place) => {
    if (open === "a") {
      setA(p);
      if (b?.id === p.id) setB(null);
      setOpen(range ? null : "b");
    } else {
      setB(p);
      setOpen(null);
    }
  };
  const groups = Object.entries(
    places.reduce<Record<string, Place[]>>((g, p) => ((g[KIND[p.kind]?.group ?? "Autres"] ??= []).push(p), g), {}),
  );

  /* ---------- dates ---------- */
  const pickDay = (d: string) => {
    if (!range) {
      setFrom(d);
      setOpen(null);
    } else if (open === "from" || !from || d < from) {
      setFrom(d);
      if (to && to <= d) setTo("");
      setOpen("to");
    } else {
      setTo(d === from ? addDays(d, 1) : d);
      setOpen(null);
    }
  };
  const start = from || today;
  const fri = (() => {
    const d = fromYmd(today);
    d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
    return ymd(d);
  })();
  const presets = range
    ? [
        { label: "Ce week-end", from: fri, to: addDays(fri, 3) },
        { label: "3 jours", from: start, to: addDays(start, 3) },
        { label: "1 semaine", from: start, to: addDays(start, 7) },
        { label: "1 mois", from: start, to: addDays(start, 30) },
      ]
    : [
        { label: "Aujourd'hui", from: today, to: "" },
        { label: "Demain", from: addDays(today, 1), to: "" },
        { label: "Ce week-end", from: fri === today ? addDays(today, 1) : fri, to: "" },
      ];

  const teaser = range
    ? perDay > 0 && (
        <>
          dès <b className="text-sand">{money(perDay, currency)}</b> / jour
        </>
      )
    : perKm > 0 && (
        <>
          dès <b className="text-sand">{money(perKm, currency)}</b> / km
        </>
      );

  const chip = (on: boolean) =>
    `min-h-11 shrink-0 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors ${on ? "bg-linear-to-br from-aqua to-teal text-[#02211f]" : "bg-white/5 text-ink hover:bg-white/10"}`;

  return (
    <div className="quick-wrap">
      <form
        action="/reserver"
        className={`quick relative grid grid-cols-1 gap-1.5 rounded-[26px] p-2 lg:items-center lg:gap-1 ${range ? "lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.25fr)_auto]" : "lg:grid-cols-[auto_minmax(0,2.3fr)_minmax(0,0.8fr)_auto]"}`}
      >
        <input type="hidden" name="mode" value={mode} />
        {a && <input type="hidden" name="a" value={a.id} />}
        {!range && b && <input type="hidden" name="b" value={b.id} />}
        {from && <input type="hidden" name="from" value={from} />}
        {range && to && <input type="hidden" name="to" value={to} />}

        {/* service switch */}
        <div className="relative grid grid-cols-2 rounded-2xl bg-black/30 p-1 lg:w-[228px]" role="radiogroup" aria-label="Service">
          <span
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-linear-to-br from-aqua to-teal shadow-[0_8px_22px_-8px_rgb(134_207_207/0.9)] transition-transform duration-500 ease-expo"
            style={{ transform: range ? "translateX(100%)" : "none" }}
            aria-hidden="true"
          />
          {(["transfert", "location"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                setOpen(null);
              }}
              className={`relative z-10 flex min-h-13 cursor-pointer flex-col items-center justify-center rounded-xl leading-tight transition-colors duration-300 ${mode === m ? "text-[#02211f]" : "text-mist hover:text-ink"}`}
            >
              <span className="text-[0.92rem] font-bold">{m === "transfert" ? "Transfert" : "Location"}</span>
              <span className={`text-[0.66rem] font-medium ${mode === m ? "text-[#02211f]/70" : "text-fog"}`}>{m === "transfert" ? "avec chauffeur" : "sans chauffeur"}</span>
            </button>
          ))}
        </div>

        {/* where */}
        <div ref={where} className={`grid gap-1.5 lg:gap-0 ${range ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} lg:relative`}>
          <Cell icon="pin" label={range ? "Prise en charge" : "Départ"} active={open === "a"} onClick={() => toggle("a")}>
            {value(a?.name, range ? "Où récupérer la voiture ?" : "D'où partez-vous ?")}
          </Cell>
          {!range && (
            <Cell icon="route" label="Destination" active={open === "b"} onClick={() => toggle("b")} className="lg:before:absolute lg:before:inset-y-3 lg:before:left-0 lg:before:w-px lg:before:bg-line">
              {value(b?.name, "Où allez-vous ?")}
            </Cell>
          )}
        </div>

        {/* when */}
        <div ref={when} className={`grid gap-1.5 lg:gap-0 ${range ? "grid-cols-2" : "grid-cols-1"} lg:relative lg:before:absolute lg:before:inset-y-3 lg:before:left-0 lg:before:w-px lg:before:bg-line`}>
          <Cell icon="calendar" label={range ? "Départ" : "Date"} active={open === "from"} onClick={() => toggle("from")}>
            {value(from && shortDate(from), "Quand ?")}
          </Cell>
          {range && (
            <Cell icon="calendar" label="Retour" active={open === "to"} onClick={() => setOpen(open === "to" ? null : from ? "to" : "from")}>
              {value(to && shortDate(to), "Jusqu'à ?")}
            </Cell>
          )}
        </div>

        {/* action */}
        <div className="flex flex-col gap-1.5 lg:pl-1">
          <button className="quick-go btn btn--solid min-h-14 w-full px-6 text-[0.98rem] lg:min-w-[190px]" type="submit">
            {range ? "Voir les voitures" : "Voir mon prix"} <Icon name="arrow" size={19} />
          </button>
          {teaser && <p className="text-center text-[0.72rem] text-mist lg:hidden">{teaser}</p>}
        </div>

        {/* ---------- place panel ---------- */}
        <Popover
          open={open === "a" || open === "b"}
          onClose={() => setOpen(null)}
          anchor={where}
          title={open === "b" ? "Destination" : range ? "Prise en charge" : "Point de départ"}
          width={420}
        >
          {!range && (
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-black/25 p-1 text-sm">
              {(["a", "b"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOpen(k)}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-left ${open === k ? "bg-white/10 text-ink" : "text-mist"}`}
                >
                  <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[0.6rem] font-bold text-[#02211f] ${k === "a" ? "bg-aqua" : "bg-sand"}`}>{k.toUpperCase()}</span>
                  <span className="truncate">{(k === "a" ? a?.name : b?.name) ?? (k === "a" ? "Départ" : "Destination")}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-3">
            {groups.map(([g, list]) => (
              <div key={g}>
                <p className="mb-1 px-1 text-[0.66rem] font-semibold tracking-[0.18em] text-fog uppercase">{g}</p>
                <ul className="flex flex-col gap-0.5">
                  {list.map((p) => {
                    const on = (open === "a" ? a : b)?.id === p.id;
                    const other = (open === "a" ? b : a)?.id === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={other && !range}
                          onClick={() => choosePlace(p)}
                          className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 text-left transition-colors disabled:cursor-default disabled:opacity-35 ${on ? "bg-aqua/15" : "hover:bg-white/[0.07]"}`}
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-sm text-aqua" aria-hidden="true">
                            {KIND[p.kind]?.icon ?? "●"}
                          </span>
                          <span className={`flex-1 ${on ? "font-semibold" : ""}`}>{p.name}</span>
                          {on && <Icon name="check" size={18} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-white/[0.04] p-3 text-xs text-mist">
            <span className="text-aqua">
              <Icon name="pin" size={16} />
            </span>
            Une autre adresse, un hôtel ou un point précis ? Vous pourrez la chercher ou la placer sur la carte à l&apos;étape suivante.
          </p>
        </Popover>

        {/* ---------- date panel ---------- */}
        <Popover
          open={open === "from" || open === "to"}
          onClose={() => setOpen(null)}
          anchor={when}
          title={range ? (open === "to" ? "Date de retour" : "Date de départ") : "Date du trajet"}
          width={range ? 700 : 372}
        >
          <div className="mb-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className={chip(p.from === from && p.to === (range ? to : ""))}
                onClick={() => {
                  setFrom(p.from);
                  setTo(p.to);
                  setOpen(null);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Calendar
            key={`${mode}-${open}`}
            value={range ? null : from || null}
            start={range ? from || null : null}
            end={range ? to || null : null}
            min={range && open === "to" && from ? from : today}
            onPick={pickDay}
            months={range ? 2 : 1}
          />
          {range && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-3">
              <p className="text-sm text-mist" aria-live="polite">
                {from && to ? (
                  <>
                    <b className="font-display text-base text-sand">
                      {days} jour{days > 1 ? "s" : ""}
                    </b>{" "}
                    · du {shortDate(from)} au {shortDate(to)}
                  </>
                ) : from ? (
                  "Choisissez maintenant la date de retour"
                ) : (
                  "Choisissez la date de départ"
                )}
              </p>
              {(from || to) && (
                <button
                  type="button"
                  className="min-h-11 cursor-pointer rounded-full px-4 text-sm text-mist hover:text-ink"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setOpen("from");
                  }}
                >
                  Effacer
                </button>
              )}
            </div>
          )}
        </Popover>
      </form>

      {/* reassurance under the bar */}
      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[0.78rem] text-mist">
        {teaser && <li className="max-lg:hidden">{teaser}</li>}
        {[
          range ? "Prix fixé avant de réserver" : "Prix calculé au kilomètre près",
          "Aucun frais caché",
          "Confirmation rapide par WhatsApp",
        ].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span className="grid size-4 place-items-center rounded-full bg-aqua/20 text-aqua">
              <Icon name="check" size={11} />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
