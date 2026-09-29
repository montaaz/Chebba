"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import manifest from "@/lib/images.json";
import Icon from "./Icon";

/* Full-screen photo viewer for every element marked `data-zoom="<image name>"`.
   Phone: pinch to zoom, double-tap, drag to pan, swipe sideways to browse, swipe down to close.
   Desktop: click, double-click, mouse wheel, drag, arrow keys, +/- and Escape.
   The page markup stays server-rendered; this only enhances it. */

type Item = { name: string; caption: string; alt: string; el: HTMLElement };
type Name = keyof typeof manifest;

const MAX = 5;
const DOUBLE_TAP_MS = 280;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const srcs = (name: string) => {
  const m = manifest[name as Name];
  if (!m) return null;
  const set = (ext: string) => m.widths.map((w) => `/img/${name}-${w}.${ext}?v=${m.v} ${w}w`).join(", ");
  return { avif: set("avif"), webp: set("webp"), src: `/img/${name}-${m.widths[m.widths.length - 1]}.webp?v=${m.v}`, ratio: m.width / m.height };
};

export default function Lightbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [chrome, setChrome] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null); // the zoomable layer of the current slide
  const closeBtn = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const pushed = useRef(false);

  // live gesture state lives in refs: 60 updates a second must not re-render React
  const t = useRef({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{
    mode: "none" | "pan" | "pinch" | "swipe";
    sx: number; sy: number; st: { s: number; x: number; y: number };
    dist: number; mid: { x: number; y: number };
    dx: number; dy: number; axis: "" | "x" | "y"; time: number; moved: boolean;
  }>({ mode: "none", sx: 0, sy: 0, st: { s: 1, x: 0, y: 0 }, dist: 0, mid: { x: 0, y: 0 }, dx: 0, dy: 0, axis: "", time: 0, moved: false });
  const lastTap = useRef({ time: 0, x: 0, y: 0 });
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const open = index !== null;
  const item = open ? items[index] : null;
  const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- geometry ---------- */
  const fitted = useCallback(() => {
    const box = stage.current?.getBoundingClientRect();
    const info = item ? srcs(item.name) : null;
    if (!box || !info) return { W: 1, H: 1, w: 1, h: 1, left: 0, top: 0 };
    const w = Math.min(box.width, box.height * info.ratio);
    return { W: box.width, H: box.height, w, h: w / info.ratio, left: box.left, top: box.top };
  }, [item]);

  const limits = (s: number) => {
    const f = fitted();
    return { x: Math.max(0, (f.w * s - f.W) / 2), y: Math.max(0, (f.h * s - f.H) / 2) };
  };

  const paint = (animate: boolean) => {
    const el = layer.current;
    if (!el) return;
    el.style.transition = animate && !calm ? "transform .32s cubic-bezier(.16,1,.3,1)" : "none";
    el.style.transform = `translate3d(${t.current.x}px, ${t.current.y}px, 0) scale(${t.current.s})`;
    const z = t.current.s > 1.01;
    setZoomed((prev) => (prev === z ? prev : z));
  };

  /* keeps the picture inside the screen; `soft` lets it stretch a little while a finger is down */
  const settle = (soft = false) => {
    const c = t.current;
    const s = soft ? clamp(c.s, 0.8, MAX * 1.25) : clamp(c.s, 1, MAX);
    const lim = limits(s);
    const band = (v: number, m: number) => (v > m ? m + (v - m) / 3 : v < -m ? -m + (v + m) / 3 : v);
    t.current = soft
      ? { s, x: band(c.x, lim.x), y: band(c.y, lim.y) }
      : { s, x: clamp(c.x, -lim.x, lim.x), y: clamp(c.y, -lim.y, lim.y) };
  };

  /* zoom to scale `ns`, keeping the point (px, py) — relative to the screen centre — still */
  const zoomAt = (ns: number, px: number, py: number, animate = true) => {
    const c = t.current;
    const k = ns / c.s;
    t.current = { s: ns, x: px - (px - c.x) * k, y: py - (py - c.y) * k };
    settle();
    paint(animate);
  };

  const reset = (animate = false) => {
    t.current = { s: 1, x: 0, y: 0 };
    paint(animate);
  };

  const slideTo = (i: number, dx = 0, animate = true) => {
    const el = track.current;
    if (!el) return;
    el.style.transition = animate && !calm ? "transform .38s cubic-bezier(.16,1,.3,1)" : "none";
    el.style.transform = `translate3d(calc(${-i * 100}% + ${dx}px), 0, 0)`;
  };

  /* ---------- open / close ---------- */
  const show = useCallback((i: number, from?: HTMLElement) => {
    returnTo.current = from ?? null;
    setChrome(true);
    setIndex(i);
    if (!pushed.current) {
      // the phone's back button closes the viewer instead of leaving the page
      history.pushState({ ...(history.state ?? {}), lightbox: true }, "");
      pushed.current = true;
    }
  }, []);

  const hide = useCallback((fromHistory = false) => {
    setIndex(null);
    if (pushed.current) {
      pushed.current = false;
      if (!fromHistory) history.back();
    }
    returnTo.current?.focus({ preventScroll: true });
  }, []);

  const go = useCallback(
    (dir: number) => {
      setIndex((cur) => (cur === null ? cur : (cur + dir + items.length) % items.length));
    },
    [items.length],
  );

  /* collect the zoomable elements and make them keyboard- and screen-reader friendly */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-zoom]"));
    const list = els
      .filter((el) => srcs(el.dataset.zoom!))
      .map((el) => ({
        el,
        name: el.dataset.zoom!,
        caption: el.dataset.zoomCaption ?? "",
        alt: el.querySelector("img")?.alt ?? "",
      }));
    setItems(list);
    for (const it of list) {
      it.el.tabIndex = 0;
      it.el.setAttribute("role", "button");
      it.el.setAttribute("aria-label", `Agrandir la photo : ${it.caption || it.alt}`);
    }
    const pick = (target: EventTarget | null) => {
      const el = (target as HTMLElement | null)?.closest?.<HTMLElement>("[data-zoom]");
      return el ? list.findIndex((it) => it.el === el) : -1;
    };
    const onClick = (e: MouseEvent) => {
      const i = pick(e.target);
      if (i < 0) return;
      e.preventDefault();
      show(i, list[i].el);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const i = pick(e.target);
      if (i < 0) return;
      e.preventDefault();
      show(i, list[i].el);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [show]);

  /* while open: lock page scroll, keyboard, back button, resize */
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = { overflow: html.style.overflow, overscroll: html.style.overscrollBehavior };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    closeBtn.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") zoomAt(Math.min(MAX, t.current.s * 1.6), 0, 0);
      else if (e.key === "-") zoomAt(Math.max(1, t.current.s / 1.6), 0, 0);
      else if (e.key === "0") reset(true);
      else if (e.key === "Tab") {
        // keep keyboard focus inside the viewer
        const f = Array.from(document.querySelectorAll<HTMLElement>("[data-lightbox] button:not([disabled])"));
        const i = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
      }
    };
    const onPop = () => hide(true);
    const onResize = () => {
      settle();
      paint(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    window.addEventListener("resize", onResize);
    return () => {
      html.style.overflow = prev.overflow;
      html.style.overscrollBehavior = prev.overscroll;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hide, go]);

  /* new photo: back to fit, slide into place */
  useEffect(() => {
    if (index === null) return;
    reset(false);
    slideTo(index, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  /* mouse wheel / trackpad zoom around the cursor (needs a non-passive listener) */
  useEffect(() => {
    const el = stage.current;
    if (!open || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = fitted();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
      zoomAt(clamp(t.current.s * factor, 1, MAX), e.clientX - f.left - f.W / 2, e.clientY - f.top - f.H / 2, false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fitted]);

  /* ---------- touch & mouse gestures ---------- */
  const rel = (p: { x: number; y: number }) => {
    const f = fitted();
    return { x: p.x - f.left - f.W / 2, y: p.y - f.top - f.H / 2 };
  };

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    stage.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const G = g.current;
    G.st = { ...t.current };
    if (pts.length === 2) {
      G.mode = "pinch";
      G.dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      G.mid = rel({ x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 });
      G.moved = true;
      slideTo(index ?? 0, 0);
    } else if (pts.length === 1) {
      G.mode = t.current.s > 1.01 ? "pan" : "swipe";
      G.sx = e.clientX;
      G.sy = e.clientY;
      G.dx = G.dy = 0;
      G.axis = "";
      G.time = performance.now();
      G.moved = false;
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const G = g.current;
    const pts = [...pointers.current.values()];

    if (G.mode === "pinch" && pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = rel({ x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 });
      const s = G.st.s * (dist / G.dist);
      // the image point that was under the fingers stays under the fingers
      const qx = (G.mid.x - G.st.x) / G.st.s, qy = (G.mid.y - G.st.y) / G.st.s;
      t.current = { s, x: mid.x - qx * s, y: mid.y - qy * s };
      settle(true);
      paint(false);
      return;
    }

    const dx = e.clientX - G.sx, dy = e.clientY - G.sy;
    if (Math.hypot(dx, dy) > 6) G.moved = true;

    if (G.mode === "pan") {
      t.current = { s: G.st.s, x: G.st.x + dx, y: G.st.y + dy };
      settle(true);
      paint(false);
    } else if (G.mode === "swipe" && G.moved) {
      if (!G.axis) G.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      G.dx = dx;
      G.dy = dy;
      if (G.axis === "x") {
        // resist at the ends of the list
        const edge = (index === 0 && dx > 0) || (index === items.length - 1 && dx < 0);
        slideTo(index ?? 0, edge ? dx / 3 : dx, false);
      } else if (layer.current) {
        const k = Math.max(0, dy);
        layer.current.style.transition = "none";
        layer.current.style.transform = `translate3d(0, ${k}px, 0) scale(${1 - Math.min(k, 400) / 1600})`;
        const bg = stage.current?.parentElement;
        if (bg) bg.style.setProperty("--fade", String(1 - Math.min(k, 300) / 400));
      }
    }
  };

  const onUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const G = g.current;
    const left = pointers.current.size;

    if (G.mode === "pinch") {
      if (left === 1) {
        // one finger stays down: carry on as a pan from here
        const p = [...pointers.current.values()][0];
        G.mode = "pan";
        G.sx = p.x;
        G.sy = p.y;
        G.st = { ...t.current };
        return;
      }
      settle();
      paint(true);
      G.mode = "none";
      return;
    }
    if (left > 0) return;

    if (G.mode === "pan") {
      settle();
      paint(true);
    } else if (G.mode === "swipe" && G.moved) {
      const dt = Math.max(1, performance.now() - G.time);
      const bg = stage.current?.parentElement;
      if (G.axis === "x") {
        const fast = Math.abs(G.dx) / dt > 0.45;
        const far = Math.abs(G.dx) > (stage.current?.clientWidth ?? 400) * 0.22;
        const dir = G.dx < 0 ? 1 : -1;
        const target = (index ?? 0) + dir;
        if ((fast || far) && target >= 0 && target < items.length) {
          slideTo(target);
          setTimeout(() => setIndex(target), calm ? 0 : 300);
        } else slideTo(index ?? 0);
      } else {
        if (G.dy > 110 || G.dy / dt > 0.6) hide();
        else {
          reset(true);
          bg?.style.setProperty("--fade", "1");
        }
      }
    }

    // taps: one toggles the controls, two zoom in or out where you tapped
    if (!G.moved) {
      const now = performance.now();
      const L = lastTap.current;
      if (now - L.time < DOUBLE_TAP_MS && Math.hypot(e.clientX - L.x, e.clientY - L.y) < 30) {
        clearTimeout(tapTimer.current);
        lastTap.current.time = 0;
        const p = rel({ x: e.clientX, y: e.clientY });
        if (t.current.s > 1.01) reset(true);
        else zoomAt(2.6, p.x, p.y);
      } else {
        lastTap.current = { time: now, x: e.clientX, y: e.clientY };
        tapTimer.current = setTimeout(() => setChrome((c) => !c), DOUBLE_TAP_MS);
      }
    }
    G.mode = "none";
  };

  if (!open || !item) return null;

  const btn =
    "grid size-12 cursor-pointer place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/70 disabled:opacity-40";

  return (
    <div
      data-lightbox
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de photos"
      className="lightbox fixed inset-0 z-[200] select-none"
      style={{ "--fade": 1 } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-[#010d0e]" style={{ opacity: "var(--fade)" }} aria-hidden="true" />

      {/* slides */}
      <div
        ref={stage}
        className="absolute inset-0 touch-none overflow-hidden"
        style={{ cursor: zoomed ? "grab" : "zoom-in" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div ref={track} className="flex h-full will-change-transform">
          {items.map((it, i) => {
            const info = srcs(it.name)!;
            const near = Math.abs(i - index) <= 1;
            return (
              <div key={it.name} className="relative grid h-full w-full shrink-0 place-items-center" aria-hidden={i !== index}>
                {near && (
                  <div ref={i === index ? layer : undefined} className="grid h-full w-full place-items-center will-change-transform">
                    <picture className="contents">
                      <source type="image/avif" srcSet={info.avif} sizes="100vw" />
                      <img
                        src={info.src}
                        srcSet={info.webp}
                        sizes="100vw"
                        alt={it.alt}
                        draggable={false}
                        decoding="async"
                        className="max-h-full max-w-full object-contain"
                        style={{ aspectRatio: String(info.ratio) }}
                      />
                    </picture>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* controls */}
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${chrome ? "opacity-100" : "opacity-0"}`}
        style={{ opacity: chrome ? "var(--fade)" : 0 }}
      >
        <div className="flex items-center justify-between gap-3 bg-linear-to-b from-black/60 to-transparent px-[max(1rem,env(safe-area-inset-left))] pt-[max(0.9rem,env(safe-area-inset-top))] pb-10">
          <span className="rounded-full bg-black/40 px-3.5 py-1.5 text-sm font-semibold text-white tabular-nums backdrop-blur-md" aria-live="polite">
            {index + 1} / {items.length}
          </span>
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              className={`${btn} max-md:hidden`}
              aria-label="Zoom arrière"
              disabled={!zoomed}
              onClick={() => zoomAt(Math.max(1, t.current.s / 1.6), 0, 0)}
            >
              <span className="text-2xl leading-none">−</span>
            </button>
            <button
              type="button"
              className={`${btn} max-md:hidden`}
              aria-label="Zoom avant"
              disabled={t.current.s >= MAX - 0.01}
              onClick={() => zoomAt(Math.min(MAX, t.current.s * 1.6), 0, 0)}
            >
              <span className="text-2xl leading-none">+</span>
            </button>
            <button ref={closeBtn} type="button" className={btn} aria-label="Fermer" onClick={() => hide()}>
              <span className="text-2xl leading-none">✕</span>
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 bg-linear-to-t from-black/70 to-transparent px-[max(1rem,env(safe-area-inset-left))] pt-12 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" className={`${btn} pointer-events-auto max-md:hidden`} aria-label="Photo précédente" onClick={() => go(-1)}>
            <Icon name="back" size={20} />
          </button>
          <p className="mx-auto max-w-2xl text-center text-sm text-white/90 md:text-base">
            {item.caption}
            <span className="mt-1 block text-xs text-white/55 md:hidden">
              {zoomed ? "Double-touchez pour revenir" : "Pincez ou double-touchez pour zoomer · glissez pour changer"}
            </span>
          </p>
          <button type="button" className={`${btn} pointer-events-auto max-md:hidden`} aria-label="Photo suivante" onClick={() => go(1)}>
            <Icon name="arrow" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
