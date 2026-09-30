"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, fromYmd, fullDate, monthTitle, today, ymd } from "@/lib/dates";

type Props = {
  /* single selection */
  value?: string | null;
  /* range selection: both ends are drawn, and the days between are banded */
  start?: string | null;
  end?: string | null;
  min?: string;
  max?: string;
  onPick: (day: string) => void;
  /* how many months side by side on wide screens (phones always show one) */
  months?: 1 | 2;
};

const WEEK = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const firstOf = (s: string) => {
  const d = fromYmd(s);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
const shift = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/* Monday-first month grid; blank cells before the 1st so every date sits under its weekday */
function grid(view: Date) {
  const lead = (view.getDay() + 6) % 7;
  const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= count; d++) cells.push(ymd(new Date(view.getFullYear(), view.getMonth(), d)));
  return cells;
}

export default function Calendar({ value, start, end, min, max, onPick, months = 1 }: Props) {
  const now = today();
  const anchor = value || start || min || now;
  const [view, setView] = useState(() => firstOf(anchor));
  const [focus, setFocus] = useState(anchor);
  const [hover, setHover] = useState<string | null>(null);
  const [wide, setWide] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const shown = wide ? months : 1;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // the day to start from gets keyboard focus as soon as the calendar opens
  useEffect(() => {
    root.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const off = (d: string) => (min != null && d < min) || (max != null && d > max);
  const minView = min ? firstOf(min) : null;
  const canBack = !minView || view > minView;

  // range drawn while the second end is being chosen: follows the pointer
  const lo = start ?? null;
  const hi = end ?? (start && hover && hover > start ? hover : null);

  const move = (to: string) => {
    setFocus(to);
    const f = firstOf(to);
    const last = shift(view, shown - 1);
    if (f < view) setView(f);
    else if (f > last) setView(shift(f, -(shown - 1)));
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(`[data-day="${to}"]`)?.focus({ preventScroll: true }));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (k in step) move(addDays(focus, step[k]));
    else if (k === "Home") move(addDays(focus, -((fromYmd(focus).getDay() + 6) % 7)));
    else if (k === "End") move(addDays(focus, 6 - ((fromYmd(focus).getDay() + 6) % 7)));
    else if (k === "PageUp" || k === "PageDown") {
      const d = fromYmd(focus);
      const n = new Date(d.getFullYear(), d.getMonth() + (k === "PageUp" ? -1 : 1), Math.min(d.getDate(), 28));
      move(ymd(n));
    } else return;
    e.preventDefault();
  };

  const views = useMemo(() => Array.from({ length: shown }, (_, i) => shift(view, i)), [view, shown]);

  const nav =
    "grid size-11 cursor-pointer place-items-center rounded-full text-mist transition-colors hover:bg-white/8 hover:text-ink disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent";

  return (
    <div ref={root} className={`grid gap-5 ${shown === 2 ? "grid-cols-2" : ""}`} onKeyDown={onKey} onPointerLeave={() => setHover(null)}>
      {views.map((m, i) => (
        <div key={m.getTime()} className="min-w-0">
          <div className="mb-1 flex items-center justify-between">
            {i === 0 ? (
              <button type="button" className={nav} disabled={!canBack} onClick={() => setView(shift(view, -1))} aria-label="Mois précédent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
            ) : (
              <span className="size-11" />
            )}
            <p className="font-display text-[0.95rem] font-medium" aria-live="polite">
              {monthTitle(m)}
            </p>
            {i === views.length - 1 ? (
              <button type="button" className={nav} onClick={() => setView(shift(view, 1))} aria-label="Mois suivant">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            ) : (
              <span className="size-11" />
            )}
          </div>

          <div className="grid grid-cols-7 text-center" role="grid" aria-label={monthTitle(m)}>
            {WEEK.map((w, j) => (
              <span key={w} className={`pb-1.5 text-[0.66rem] font-semibold tracking-wider uppercase ${j > 4 ? "text-aqua/70" : "text-fog"}`} role="columnheader" aria-label={w}>
                {w.slice(0, 2)}
              </span>
            ))}
            {grid(m).map((d, j) => {
              if (!d) return <span key={`b${j}`} />;
              const disabled = off(d);
              const isEnd = d === lo || d === hi || d === value;
              const inside = lo && hi && d > lo && d < hi;
              const band = lo && hi && lo !== hi && (d === lo || d === hi || inside);
              const col = j % 7;
              return (
                <span
                  key={d}
                  className={`relative my-0.5 grid place-items-center ${band ? "bg-aqua/12" : ""} ${band && (d === lo || col === 0 || fromYmd(d).getDate() === 1) ? "rounded-l-full" : ""} ${band && (d === hi || col === 6 || addDays(d, 1).slice(8) === "01") ? "rounded-r-full" : ""}`}
                  role="gridcell"
                  aria-selected={isEnd || undefined}
                >
                  <button
                    type="button"
                    data-day={d}
                    tabIndex={d === focus ? 0 : -1}
                    disabled={disabled}
                    aria-label={fullDate(d) + (d === now ? ", aujourd'hui" : "")}
                    aria-pressed={isEnd}
                    onClick={() => onPick(d)}
                    onPointerEnter={() => setHover(d)}
                    onFocus={() => setFocus(d)}
                    className={`relative grid size-11 cursor-pointer place-items-center rounded-full text-[0.92rem] tabular-nums transition-[background-color,color,transform] outline-none focus-visible:ring-2 focus-visible:ring-aqua active:scale-95 disabled:cursor-default disabled:text-white/20 disabled:hover:bg-transparent ${
                      isEnd
                        ? "bg-linear-to-br from-aqua to-teal font-bold text-[#02211f] shadow-[0_8px_18px_-8px_rgb(134_207_207/0.9)]"
                        : inside
                          ? "text-ink hover:bg-aqua/20"
                          : "text-ink/90 hover:bg-white/10"
                    }`}
                  >
                    {Number(d.slice(8))}
                    {d === now && !isEnd && <span className="absolute bottom-1.5 size-1 rounded-full bg-sand" aria-hidden="true" />}
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
