"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { photoSrcSet, photoUrl } from "@/lib/photos";
import Icon from "./Icon";
import Picture from "./Picture";

export type ShowFrame =
  /* a photo the admin uploaded */
  | { kind: "photo"; id: number; version: number; width: number; height: number; k: string; title: string; text: string }
  /* a built-in image (used only while a vehicle has no uploaded photos) */
  | { kind: "builtin"; img: string; k: string; title: string; text: string };

export type ShowCar = { id: number; slug: string; name: string; tag: string; frames: ShowFrame[] };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const two = (n: number) => String(n).padStart(2, "0");

/* "Tour du propriétaire": one vehicle at a time, its photos wipe in as you scroll.
   Vehicles come from the database, so a car added in the admin appears here with its photos. */
export default function Showroom({ cars }: { cars: ShowCar[] }) {
  const [carIdx, setCarIdx] = useState(0);
  const [active, setActive] = useState(0);
  const section = useRef<HTMLElement>(null);
  const bar = useRef<HTMLElement>(null);
  const car = cars[carIdx] ?? cars[0];
  const frames = car?.frames ?? [];
  const last = frames.length - 1;

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let queued = false;
    let current = -1;

    const draw = () => {
      queued = false;
      const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-layer]"));
      const n = layers.length - 1;
      const span = Math.max(1, el.offsetHeight - window.innerHeight);
      const p = clamp(-el.getBoundingClientRect().top / span);
      const f = p * Math.max(n, 0);
      layers.forEach((layer, i) => {
        const d = f - i;
        // each new frame wipes in from the right over the previous one
        const cut = i === 0 ? 0 : (1 - clamp((d + 0.66) / 0.4)) * 100;
        layer.style.clipPath = `inset(0 0 0 ${cut.toFixed(2)}%)`;
        const pic = layer.firstElementChild as HTMLElement | null;
        if (pic && !calm) pic.style.transform = `scale(${(1.06 + clamp(d, -1, 1) * 0.05).toFixed(4)})`;
      });
      if (bar.current) bar.current.style.transform = `scaleX(${n > 0 ? p.toFixed(4) : 1})`;
      const now = clamp(Math.round(f + 0.04), 0, Math.max(n, 0));
      if (now !== current) {
        current = now;
        setActive(now);
      }
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(draw);
    };
    // photos are lazy: pull them in a little before the section arrives
    const warm = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.querySelectorAll<HTMLImageElement>("img").forEach((img) => (img.loading = "eager"));
        warm.disconnect();
      },
      { rootMargin: "120% 0px" },
    );
    warm.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    draw();
    return () => {
      warm.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [carIdx]);

  if (!car || !frames.length) return null;

  const jump = (i: number) => {
    const el = section.current;
    if (!el || last < 1) return;
    const span = el.offsetHeight - window.innerHeight;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + (i / last) * span + 2, behavior: calm ? "auto" : "smooth" });
  };

  const pickCar = (i: number) => {
    if (i === carIdx) return;
    setCarIdx(i);
    setActive(0);
    // start the new vehicle from its first photo
    const el = section.current;
    if (el && el.getBoundingClientRect().top < 0) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "auto" });
  };

  const f = frames[clamp(active, 0, last)];

  return (
    <section ref={section} className="show" id="showroom" style={{ "--frames": Math.max(frames.length, 2) } as React.CSSProperties}>
      <div className="show__stage">
        <div className="show__copy">
          <p className="eyebrow">{cars.length > 1 ? "Notre flotte" : "Tour du propriétaire"}</p>

          {cars.length > 1 && (
            <div className="mt-4 -mb-1 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Véhicules">
              {cars.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={i === carIdx}
                  onClick={() => pickCar(i)}
                  className={`min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${i === carIdx ? "border-aqua bg-aqua/15 text-ink" : "border-hair text-mist hover:text-ink"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="show__captions">
            {frames.map((fr, i) => (
              <article className={`cap${i === active ? " on" : ""}`} key={`${car.id}-${i}`} aria-hidden={i !== active}>
                <p className="cap__k">
                  <b>{two(i + 1)}</b> / {two(frames.length)} — {fr.k}
                </p>
                <h2 className="cap__title">{fr.title}</h2>
                <p className="cap__text">{fr.text}</p>
              </article>
            ))}
          </div>

          {frames.length > 1 && (
            <div className="show__dots" role="tablist" aria-label="Photos">
              {frames.map((fr, i) => (
                <button key={i} type="button" role="tab" aria-label={`Photo ${i + 1}`} aria-selected={i === active} onClick={() => jump(i)} />
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link prefetch={false} href={`/reserver?car=${encodeURIComponent(car.slug)}`} className="btn btn--solid min-h-12">
              Réserver ce véhicule <Icon name="arrow" size={18} />
            </Link>
          </div>
        </div>

        <div className="frame">
          <div className="frame__view">
            {frames.map((fr, i) => {
              const caption = `${car.name} — photo ${i + 1} / ${frames.length}`;
              const style = { clipPath: i === 0 ? "none" : "inset(0 0 0 100%)" };
              return fr.kind === "photo" ? (
                <div
                  key={`${car.id}-${fr.id}`}
                  className="frame__layer"
                  data-layer
                  data-zoom="photo"
                  data-zoom-src={photoUrl(fr, "large")}
                  data-zoom-srcset={photoSrcSet(fr)}
                  data-zoom-ratio={(fr.width / fr.height).toFixed(4)}
                  data-zoom-group={`car-${car.id}`}
                  data-zoom-caption={caption}
                  style={style}
                >
                  <picture>
                    <img
                      src={photoUrl(fr, "small")}
                      srcSet={photoSrcSet(fr)}
                      sizes="(max-width: 900px) 92vw, 58vw"
                      width={fr.width}
                      height={fr.height}
                      alt={caption}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </picture>
                </div>
              ) : (
                <div key={`${car.id}-${fr.img}`} className="frame__layer" data-layer data-zoom={fr.img} data-zoom-group={`car-${car.id}`} data-zoom-caption={caption} style={style}>
                  <Picture name={fr.img} alt={caption} sizes="(max-width: 900px) 92vw, 58vw" />
                </div>
              );
            })}
            <span className="frame__shade" aria-hidden="true" />
          </div>
          <span className="frame__corner frame__corner--tl" aria-hidden="true" />
          <span className="frame__corner frame__corner--tr" aria-hidden="true" />
          <span className="frame__corner frame__corner--bl" aria-hidden="true" />
          <span className="frame__corner frame__corner--br" aria-hidden="true" />
          <div className="frame__meta" aria-hidden="true">
            <span>
              <i className="frame__rec" /> {car.tag}
            </span>
            <span className="frame__bar">
              <b ref={bar} />
            </span>
            <span>{two(clamp(active, 0, last) + 1)}</span>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {f ? `${car.name}, photo ${active + 1} sur ${frames.length}` : ""}
      </p>
    </section>
  );
}
