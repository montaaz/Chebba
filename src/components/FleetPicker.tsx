"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";
import Picture from "./Picture";
import type { ShowCar } from "./Showroom";

type Props = { cars: ShowCar[]; index: number; onPick: (i: number) => void };
type Filter = "all" | "automatic" | "manual";

const two = (n: number) => String(n).padStart(2, "0");

/* The fleet as a rail of small cards: photo, name, gearbox and price at a glance.
   Grows with the fleet: arrows and a counter on wide screens, a swipe on phones,
   and a gearbox filter once the fleet has both kinds. */
export default function FleetPicker({ cars, index, onPick }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [edges, setEdges] = useState({ start: true, end: true });

  const counts = useMemo(
    () => ({ all: cars.length, automatic: cars.filter((c) => c.gear === "automatic").length, manual: cars.filter((c) => c.gear === "manual").length }),
    [cars],
  );
  const filters = cars.length >= 4 && counts.automatic > 0 && counts.manual > 0;
  const shown = cars.map((c, i) => ({ c, i })).filter(({ c }) => filter === "all" || c.gear === filter);
  const pos = shown.findIndex((s) => s.i === index);

  // keep the chosen card in view, inside the rail only (the page itself must not move)
  useEffect(() => {
    const el = rail.current;
    const card = el?.querySelector<HTMLElement>(`[data-car="${index}"]`);
    if (!el || !card) return;
    const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [index, filter]);

  // fade only the side where more cards are waiting
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const on = () => setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 });
    on();
    el.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      el.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [shown.length]);

  const step = (d: number) => {
    if (!shown.length) return;
    const next = shown[((pos < 0 ? 0 : pos + d) + shown.length) % shown.length];
    onPick(next.i);
  };
  const choose = (f: Filter) => {
    setFilter(f);
    const first = cars.findIndex((c) => f === "all" || c.gear === f);
    if (f !== "all" && cars[index]?.gear !== f && first >= 0) onPick(first);
  };

  const mask = `linear-gradient(to right, ${edges.start ? "#000" : "transparent"}, #000 2.5rem, #000 calc(100% - 2.5rem), ${edges.end ? "#000" : "transparent"})`;
  const arrow =
    "grid size-9 cursor-pointer place-items-center rounded-full border border-hair text-mist transition-colors hover:border-aqua hover:text-ink disabled:cursor-default disabled:opacity-30";

  return (
    <div className="mt-3 md:mt-4">
      <div className="mb-2.5 flex items-center justify-between gap-3 max-md:hidden">
        <p className="text-xs text-fog tabular-nums">
          {cars.length} véhicules{shown.length < cars.length ? ` · ${shown.length} affichés` : ""}
        </p>
        <div className="flex items-center gap-2 max-md:hidden">
          <button type="button" className={arrow} onClick={() => step(-1)} disabled={shown.length < 2} aria-label="Véhicule précédent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <span className="min-w-12 text-center font-display text-sm tabular-nums" aria-live="polite">
            <b className="text-sand">{two(pos + 1 || 1)}</b>
            <span className="text-fog"> / {two(shown.length)}</span>
          </span>
          <button type="button" className={arrow} onClick={() => step(1)} disabled={shown.length < 2} aria-label="Véhicule suivant">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {filters && (
        <div className="mb-2.5 flex gap-1.5 max-md:hidden" role="group" aria-label="Filtrer par boîte de vitesses">
          {(["all", "automatic", "manual"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => choose(f)}
              className={`min-h-9 cursor-pointer rounded-full px-3.5 text-xs font-semibold transition-colors ${filter === f ? "bg-aqua/15 text-ink ring-1 ring-aqua/60" : "bg-white/5 text-mist hover:text-ink"}`}
            >
              {f === "all" ? "Tous" : f === "automatic" ? "Automatique" : "Manuelle"} <span className="text-fog tabular-nums">{counts[f]}</span>
            </button>
          ))}
        </div>
      )}

      <div
        ref={rail}
        role="tablist"
        aria-label="Véhicules"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            step(e.key === "ArrowRight" ? 1 : -1);
            requestAnimationFrame(() => rail.current?.querySelector<HTMLElement>("[aria-selected=true]")?.focus());
          }
        }}
        className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 py-1.5 [scrollbar-width:none] max-md:-mr-4 max-md:pr-4 [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {shown.map(({ c, i }) => {
          const on = i === index;
          const cover = c.frames[0];
          return (
            <button
              key={c.id}
              data-car={i}
              type="button"
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onPick(i)}
              className={`group/car relative flex w-[13.5rem] shrink-0 cursor-pointer snap-start items-center gap-3 rounded-2xl border p-1.5 pr-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-aqua ${
                on
                  ? "border-aqua/80 bg-aqua/12 shadow-[0_14px_34px_-16px_rgb(134_207_207/0.75)]"
                  : "border-hair bg-white/[0.03] hover:-translate-y-0.5 hover:border-line hover:bg-white/[0.06]"
              }`}
            >
              <span className={`relative h-11 w-16 shrink-0 md:h-12 md:w-[4.5rem] overflow-hidden rounded-xl bg-deep ${on ? "ring-1 ring-aqua/70" : ""}`}>
                {cover?.kind === "photo" ? (
                  <img src={photoUrl(cover, "small")} alt="" width={cover.width} height={cover.height} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover/car:scale-105" />
                ) : cover?.kind === "builtin" ? (
                  <Picture name={cover.img} alt="" sizes="72px" className="h-full w-full object-cover" />
                ) : null}
                {on && (
                  <span className="absolute top-1 left-1 grid size-4 place-items-center rounded-full bg-aqua text-[#02211f]" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                {c.make && <span className="block truncate text-[0.6rem] font-semibold tracking-[0.16em] text-fog uppercase">{c.make}</span>}
                <span className={`block truncate text-sm leading-tight font-semibold ${on ? "text-ink" : "text-ink/85"}`} title={c.name}>
                  {c.make && c.model ? c.model : c.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[0.72rem] text-fog">
                  {c.gear && <span>{c.gear === "automatic" ? "Auto" : "Manuelle"}</span>}
                  {c.gear && c.price && <span aria-hidden="true">·</span>}
                  {c.price && <span className={`font-semibold tabular-nums ${on ? "text-sand" : "text-mist"}`}>{c.price}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
