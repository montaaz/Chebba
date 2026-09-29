"use client";

import { useEffect } from "react";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* All page motion in one place: nav state, reveals, count-ups,
   hero parallax and the scroll-driven showroom frames. */
export default function Effects() {
  useEffect(() => {
    const root = document.documentElement;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = <T extends HTMLElement>(s: string, p: ParentNode = document) => p.querySelector<T>(s);
    const $$ = <T extends HTMLElement>(s: string, p: ParentNode = document) =>
      Array.from(p.querySelectorAll<T>(s));
    const off: (() => void)[] = [];

    root.classList.add("js");

    /* ---- reveals + count-ups ---- */
    const countUp = (el: HTMLElement) => {
      const end = Number(el.dataset.count);
      if (calm || !end) return;
      const t0 = performance.now();
      const dur = 1100;
      const tick = (t: number) => {
        const p = clamp((t - t0) / dur);
        el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("in");
          $$("[data-count]", el).forEach(countUp);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    $$("[data-reveal]").forEach((el) => io.observe(el));
    off.push(() => io.disconnect());

    /* ---- hero pointer parallax (mouse only) ---- */
    const hero = $("[data-hero]");
    if (hero && !calm && window.matchMedia("(pointer: fine)").matches) {
      const move = (e: PointerEvent) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        hero.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      };
      hero.addEventListener("pointermove", move, { passive: true });
      off.push(() => hero.removeEventListener("pointermove", move));
    }

    /* ---- showroom ---- */
    const show = $("[data-show]");
    const layers = show ? $$("[data-layer]", show) : [];
    const caps = show ? $$("[data-cap]", show) : [];
    const dots = show ? $$<HTMLButtonElement>("[data-dot]", show) : [];
    const bar = show ? $("[data-bar]", show) : null;
    const counter = show ? $("[data-count-frame]", show) : null;
    const last = layers.length - 1;
    let active = 0;

    // frames are lazy: pull them in a little before the section arrives
    if (show) {
      const warm = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          $$<HTMLImageElement>("img", show).forEach((img) => (img.loading = "eager"));
          warm.disconnect();
        },
        { rootMargin: "120% 0px" },
      );
      warm.observe(show);
      off.push(() => warm.disconnect());
    }

    const span = () => (show ? show.offsetHeight - window.innerHeight : 1);
    const drawShow = () => {
      if (!show || last < 1) return;
      const p = clamp(-show.getBoundingClientRect().top / span());
      const f = p * last;
      layers.forEach((layer, i) => {
        const d = f - i;
        // each new frame wipes in from the right over the previous one
        const cut = i === 0 ? 0 : (1 - clamp((d + 0.66) / 0.4)) * 100;
        layer.style.clipPath = `inset(0 0 0 ${cut.toFixed(2)}%)`;
        const pic = layer.firstElementChild as HTMLElement | null;
        if (pic && !calm) pic.style.transform = `scale(${(1.06 + clamp(d, -1, 1) * 0.05).toFixed(4)})`;
      });
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
      const now = Math.round(f + 0.04);
      if (now !== active) {
        active = clamp(now, 0, last);
        caps.forEach((c, i) => c.classList.toggle("on", i === active));
        dots.forEach((d, i) => d.setAttribute("aria-selected", String(i === active)));
        if (counter) counter.textContent = `0${active + 1}`;
      }
    };
    dots.forEach((dot, i) => {
      const go = () => {
        if (!show) return;
        const top = show.getBoundingClientRect().top + window.scrollY + (i / last) * span();
        window.scrollTo({ top, behavior: calm ? "auto" : "smooth" });
      };
      dot.addEventListener("click", go);
      off.push(() => dot.removeEventListener("click", go));
    });

    /* ---- one rAF-throttled scroll loop ---- */
    const nav = $("[data-nav]");
    let queued = false;
    const frame = () => {
      queued = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      nav?.classList.toggle("solid", y > 24);
      if (hero && !calm && y < vh * 1.2) hero.style.setProperty("--sp", clamp(y / vh).toFixed(3));
      drawShow();
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(frame);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    off.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });
    frame();

    return () => off.forEach((fn) => fn());
  }, []);

  return null;
}
