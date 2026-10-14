"use client";

import { useEffect, useId, useRef, useState } from "react";
import { addDays, joinDT, shortDate, splitDT, today } from "@/lib/dates";
import Calendar from "./Calendar";
import Popover from "./Popover";

type Props = {
  label: string;
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (v: string) => void;
  min: string; // same format: nothing earlier can be picked
  /* start of the rental, so the return calendar shows the whole period */
  rangeStart?: string;
  placeholder?: string;
};

const MINUTES = ["00", "15", "30", "45"];
const pad = (n: number) => String(n).padStart(2, "0");

/* Date + time in one field. Wide screens: calendar and time side by side, all visible at once.
   Phones: a "Date | Heure" switch, picking a day moves on to the time. Nothing scrolls. */
export default function DateTimeField({ label, value, onChange, min, rangeStart, placeholder = "Choisir la date et l'heure" }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"date" | "time">("date");
  const [wide, setWide] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const { date, time } = splitDT(value);
  const m = splitDT(min);
  const hour = time ? Number(time.slice(0, 2)) : null;
  const minute = time ? time.slice(3, 5) : null;

  const allowed = (d: string, t: string) => d > m.date || (d === m.date && t >= m.time);
  // first slot at or after the minimum on that day, rounded up to the next quarter hour
  const firstSlot = (d: string) => {
    if (d > m.date) return "10:00";
    const [h, mm] = m.time.split(":").map(Number);
    const q = Math.ceil(mm / 15) * 15;
    return q === 60 ? `${pad(h + 1)}:00` : `${pad(h)}:${pad(q)}`;
  };

  const pickDate = (d: string) => {
    let t = time || "10:00";
    if (!allowed(d, t)) t = firstSlot(d);
    onChange(joinDT(d, t));
    setTab("time");
  };
  const pickHour = (h: number) => {
    const d = date || m.date;
    let t = `${pad(h)}:${minute ?? "00"}`;
    if (!allowed(d, t)) t = MINUTES.map((q) => `${pad(h)}:${q}`).find((x) => allowed(d, x)) ?? t;
    onChange(joinDT(d, t));
  };
  const pickMinute = (q: string) => onChange(joinDT(date || m.date, `${pad(hour ?? 10)}:${q}`));

  const presets = [
    { label: "Aujourd'hui", day: today() },
    { label: "Demain", day: addDays(today(), 1) },
    { label: "Après-demain", day: addDays(today(), 2) },
  ].filter((p) => p.day >= m.date);

  const chip = (on: boolean) =>
    `min-h-11 cursor-pointer rounded-xl text-sm font-semibold tabular-nums transition-colors disabled:cursor-default disabled:opacity-25 ${
      on ? "bg-linear-to-br from-aqua to-teal text-[#02211f]" : "bg-white/5 text-ink hover:bg-white/10"
    }`;

  return (
    <div ref={wrap} className="flex min-w-0 flex-col gap-1.5">
      <span id={`${id}-l`} className="text-[0.68rem] font-semibold tracking-[0.18em] text-mist uppercase">
        {label}
      </span>
      <button
        type="button"
        aria-labelledby={`${id}-l ${id}-v`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setTab("date");
          setOpen((o) => !o);
        }}
        className={`group flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 text-left transition-colors ${
          open ? "border-aqua bg-aqua/10" : "border-hair bg-white/5 hover:border-line"
        }`}
      >
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${value ? "bg-aqua/15 text-aqua" : "bg-white/5 text-fog"}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16v14H4zM4 10h16M8 3v4m8-4v4" />
          </svg>
        </span>
        <span id={`${id}-v`} className="min-w-0 flex-1">
          {value ? (
            <>
              <span className="block truncate text-[0.98rem] font-semibold first-letter:uppercase">{shortDate(date)}</span>
              <span className="block text-xs text-aqua tabular-nums">à {time.replace(":", " h ")}</span>
            </>
          ) : (
            <span className="text-fog">{placeholder}</span>
          )}
        </span>
        <svg className={`shrink-0 text-fog transition-transform ${open ? "rotate-180" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchor={wrap} title={label} width={wide ? 664 : 372}>
        {/* phones: one step at a time, each tab showing what is already chosen */}
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-white/5 p-1 md:hidden" role="tablist" aria-label={label}>
          {(["date", "time"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl px-2 leading-tight transition-colors ${tab === t ? "bg-white/10 text-ink" : "text-mist"}`}
            >
              <span className="text-[0.62rem] font-semibold tracking-[0.16em] uppercase opacity-70">{t === "date" ? "Date" : "Heure"}</span>
              <span className="text-sm font-semibold tabular-nums first-letter:uppercase">
                {t === "date" ? (date ? shortDate(date) : "—") : time ? time.replace(":", " h ") : "—"}
              </span>
            </button>
          ))}
        </div>

        <div className="md:grid md:grid-cols-[minmax(0,1fr)_18rem] md:gap-5">
          <div className={tab === "date" ? "" : "max-md:hidden"}>
            {presets.length > 0 && (
              <div className="mb-2 flex gap-1.5">
                {presets.map((p) => (
                  <button key={p.day} type="button" className={`${chip(date === p.day)} min-w-0 flex-1 px-2 text-[0.8rem] md:min-h-9`} onClick={() => pickDate(p.day)}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <Calendar value={rangeStart ? null : date || null} start={rangeStart ?? null} end={rangeStart ? date || null : null} min={m.date} onPick={pickDate} />
          </div>

          <div className={`md:flex md:flex-col md:border-l md:border-hair md:pl-5 ${tab === "time" ? "" : "max-md:hidden"}`}>
            <div className="mb-2.5 flex min-h-11 items-center justify-between">
              <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-mist uppercase">Heure</p>
              <p className="font-display text-xl font-extrabold text-sand tabular-nums">{time ? time.replace(":", " h ") : "— h —"}</p>
            </div>
            <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Heure">
              {Array.from({ length: 24 }, (_, h) => (
                <button
                  key={h}
                  type="button"
                  className={`${chip(hour === h)} md:min-h-10`}
                  aria-pressed={hour === h}
                  disabled={!MINUTES.some((q) => allowed(date || m.date, `${pad(h)}:${q}`))}
                  onClick={() => pickHour(h)}
                >
                  {pad(h)}
                </button>
              ))}
            </div>
            <p className="mt-3 mb-1.5 text-[0.68rem] font-semibold tracking-[0.18em] text-mist uppercase">Minutes</p>
            <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white/5 p-1" role="group" aria-label="Minutes">
              {MINUTES.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`${chip(minute === q)} md:min-h-10 ${minute === q ? "" : "bg-transparent"}`}
                  aria-pressed={minute === q}
                  disabled={!allowed(date || m.date, `${pad(hour ?? 23)}:${q}`)}
                  onClick={() => pickMinute(q)}
                >
                  :{q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* always in reach: stuck to the bottom of the sheet on phones */}
        <div className="sticky bottom-0 -mx-4 mt-4 bg-[#03262a] px-4 pt-1 md:static md:mx-0 md:bg-transparent md:p-0">
          <button type="button" disabled={!value} onClick={() => setOpen(false)} className="btn btn--solid min-h-12 w-full">
            {value ? `Valider · ${shortDate(date)}, ${time.replace(":", " h ")}` : "Choisissez une date"}
          </button>
        </div>
      </Popover>
    </div>
  );
}
