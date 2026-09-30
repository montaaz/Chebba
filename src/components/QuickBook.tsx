"use client";

import { useRef, useState } from "react";
import { addDays, daysBetween, fromYmd, shortDate, ymd } from "@/lib/dates";
import Calendar from "./pickers/Calendar";
import Popover from "./pickers/Popover";
import Icon from "./Icon";

type Mode = "transfert" | "location";

const CELL =
  "group relative flex min-h-15 min-w-0 cursor-pointer flex-col justify-center gap-0.5 rounded-2xl px-4 py-2 text-left transition-colors hover:bg-aqua/10";
const LABEL = "text-[0.64rem] font-semibold tracking-[0.2em] text-aqua uppercase";

/* Hero booking bar. Posts a plain GET form to /reserver, so it still works before JavaScript loads. */
export default function QuickBook({ price, today }: { price: string; today: string }) {
  const [mode, setMode] = useState<Mode>("transfert");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<null | "from" | "to">(null);
  const dates = useRef<HTMLDivElement>(null);
  const range = mode === "location";
  const days = from && to ? daysBetween(from, to) : 0;

  const pick = (d: string) => {
    if (!range) {
      setFrom(d);
      setOpen(null);
      return;
    }
    if (open === "from" || !from || d < from) {
      // first end of the rental: keep the return only if it still comes after
      setFrom(d);
      if (to && to <= d) setTo("");
      setOpen("to");
    } else {
      setTo(d === from ? addDays(d, 1) : d);
      setOpen(null);
    }
  };

  // Friday-to-Monday of the coming weekend, then fixed lengths from the chosen start
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

  const value = (d: string, empty: string) =>
    d ? <span className="block truncate text-[0.98rem] font-semibold first-letter:uppercase">{shortDate(d)}</span> : <span className="block truncate text-[0.95rem] text-fog">{empty}</span>;

  return (
    <form
      action="/reserver"
      className="grid grid-cols-1 gap-1.5 rounded-[26px] border border-line bg-[#021e20]/65 p-2 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] backdrop-blur-lg md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
    >
      <input type="hidden" name="mode" value={mode} />
      {from && <input type="hidden" name="from" value={from} />}
      {range && to && <input type="hidden" name="to" value={to} />}

      {/* service: a two-way switch instead of a dropdown */}
      <div className="relative grid grid-cols-2 rounded-2xl bg-black/25 p-1" role="radiogroup" aria-label="Je souhaite">
        <span
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-linear-to-br from-aqua to-teal shadow-[0_8px_20px_-10px_rgb(134_207_207/0.9)] transition-transform duration-300 ease-expo"
          style={{ transform: range ? "translateX(100%)" : "none" }}
          aria-hidden="true"
        />
        {(["transfert", "location"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`relative z-10 flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl px-4 leading-tight transition-colors ${mode === m ? "text-[#02211f]" : "text-mist hover:text-ink"}`}
          >
            <span className="text-sm font-bold">{m === "transfert" ? "Transfert" : "Location"}</span>
            <span className={`text-[0.66rem] ${mode === m ? "text-[#02211f]/70" : "text-fog"}`}>{m === "transfert" ? "prix au km" : "à la journée"}</span>
          </button>
        ))}
      </div>

      {/* dates */}
      <div ref={dates} className={`grid gap-1.5 ${range ? "grid-cols-2" : "grid-cols-1"}`}>
        <button
          type="button"
          className={`${CELL} ${open === "from" ? "bg-aqua/12 ring-1 ring-aqua/50" : ""}`}
          aria-haspopup="dialog"
          aria-expanded={open === "from"}
          onClick={() => setOpen(open === "from" ? null : "from")}
        >
          <span className={LABEL}>{range ? "Départ" : "Date du trajet"}</span>
          {value(from, "Choisir une date")}
        </button>
        {range && (
          <button
            type="button"
            className={`${CELL} ${open === "to" ? "bg-aqua/12 ring-1 ring-aqua/50" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={open === "to"}
            onClick={() => setOpen(open === "to" ? null : from ? "to" : "from")}
          >
            <span className={LABEL}>Retour</span>
            {value(to, "Choisir une date")}
            {days > 0 && (
              <span className="absolute top-2 right-3 rounded-full bg-sand/15 px-2 py-0.5 text-[0.66rem] font-bold text-sand tabular-nums">
                {days} j
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-col-reverse justify-center gap-1.5 text-center md:flex-col md:pr-1">
        <small className="text-[0.68rem] tracking-[0.08em] text-mist">{price}</small>
        <button className="btn btn--solid min-h-12" type="submit">
          Calculer mon prix <Icon name="arrow" size={18} />
        </button>
      </div>

      <Popover
        open={open !== null}
        onClose={() => setOpen(null)}
        anchor={dates}
        title={range ? (open === "to" ? "Date de retour" : "Date de départ") : "Date du trajet"}
        width={range ? 700 : 372}
      >
        <div className="mb-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {presets.map((p) => {
            const on = p.from === from && p.to === (range ? to : "");
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setFrom(p.from);
                  setTo(p.to);
                  setOpen(null);
                }}
                className={`min-h-11 shrink-0 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors ${on ? "bg-linear-to-br from-aqua to-teal text-[#02211f]" : "bg-white/5 text-ink hover:bg-white/10"}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <Calendar
          key={`${mode}-${open}`}
          value={range ? null : from || null}
          start={range ? from || null : null}
          end={range ? to || null : null}
          min={range && open === "to" && from ? from : today}
          onPick={pick}
          months={range ? 2 : 1}
        />
        {range && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-3">
            <p className="text-sm text-mist" aria-live="polite">
              {from && to ? (
                <>
                  <b className="font-display text-base text-sand">{days} jour{days > 1 ? "s" : ""}</b> · du {shortDate(from)} au {shortDate(to)}
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
  );
}
