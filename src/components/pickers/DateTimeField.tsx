"use client";

import { useId, useRef, useState } from "react";
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

/* Date + time in one field: calendar, then an hour grid and a quarter-hour switch. */
export default function DateTimeField({ label, value, onChange, min, rangeStart, placeholder = "Choisir la date et l'heure" }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
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
        onClick={() => setOpen((o) => !o)}
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

      <Popover open={open} onClose={() => setOpen(false)} anchor={wrap} title={label} width={372}>
        {presets.length > 0 && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {presets.map((p) => (
              <button key={p.day} type="button" className={`${chip(date === p.day)} shrink-0 px-4`} onClick={() => pickDate(p.day)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        <Calendar value={rangeStart ? null : date || null} start={rangeStart ?? null} end={rangeStart ? date || null : null} min={m.date} onPick={pickDate} />

        <div className="mt-4 border-t border-hair pt-4">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-mist uppercase">Heure</p>
            {time && <p className="font-display text-lg font-extrabold text-sand tabular-nums">{time.replace(":", " h ")}</p>}
          </div>
          <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Heure">
            {Array.from({ length: 24 }, (_, h) => (
              <button
                key={h}
                type="button"
                className={chip(hour === h)}
                aria-pressed={hour === h}
                disabled={!MINUTES.some((q) => allowed(date || m.date, `${pad(h)}:${q}`))}
                onClick={() => pickHour(h)}
              >
                {pad(h)}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 rounded-2xl bg-white/5 p-1" role="group" aria-label="Minutes">
            {MINUTES.map((q) => (
              <button
                key={q}
                type="button"
                className={`${chip(minute === q)} ${minute === q ? "" : "bg-transparent"}`}
                aria-pressed={minute === q}
                disabled={!allowed(date || m.date, `${pad(hour ?? 23)}:${q}`)}
                onClick={() => pickMinute(q)}
              >
                :{q}
              </button>
            ))}
          </div>
        </div>

        <button type="button" disabled={!value} onClick={() => setOpen(false)} className="btn btn--solid mt-4 min-h-12 w-full">
          {value ? `Valider · ${shortDate(date)}, ${time.replace(":", " h ")}` : "Choisissez une date"}
        </button>
      </Popover>
    </div>
  );
}
