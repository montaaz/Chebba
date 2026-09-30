"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  /* shown as the sheet title on phones, and as the dialog's accessible name everywhere */
  title: string;
  children: React.ReactNode;
  width?: number;
};

const PHONE = "(max-width: 767px)";

/* Floating panel.  ≥768px: anchored under (or above) the field, following it on scroll.
   <768px: a bottom sheet within thumb reach, with a backdrop.
   Rendered in <body> so no parent with overflow:hidden can clip it. */
export default function Popover({ open, onClose, anchor, title, children, width = 340 }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean; max: number } | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const place = useCallback(() => {
    const a = anchor.current?.getBoundingClientRect();
    const el = panel.current;
    if (!a || !el) return;
    // natural height, whatever limit is currently applied
    const h = el.scrollHeight;
    const below = window.innerHeight - a.bottom - 16;
    const above = a.top - 16;
    // open where it fits; if it fits nowhere, on the roomier side, scrolling inside
    const up = below < h && above > below;
    const max = Math.max(220, up ? above : below);
    const shown = Math.min(h, max);
    const left = Math.min(Math.max(8, a.left), window.innerWidth - width - 8);
    setPos({ top: up ? a.top - 8 - shown : a.bottom + 8, left, up, max });
  }, [anchor, width]);

  useLayoutEffect(() => {
    if (!open || phone) return;
    place();
    // a second pass once the content has its real height (fonts, lists)
    const id = requestAnimationFrame(place);
    return () => cancelAnimationFrame(id);
  }, [open, phone, place, children]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      close.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
        anchor.current?.querySelector<HTMLElement>("button")?.focus();
      }
    };
    let raf = 0;
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    // phones: the page behind the sheet must not scroll
    const html = document.documentElement;
    const prev = html.style.overflow;
    if (window.matchMedia(PHONE).matches) html.style.overflow = "hidden";
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      cancelAnimationFrame(raf);
      html.style.overflow = prev;
    };
  }, [open, anchor, place]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      {phone && <div className="picker-backdrop fixed inset-0 z-[119] bg-black/55 backdrop-blur-[2px]" aria-hidden="true" />}
      <div
        ref={panel}
        role="dialog"
        aria-label={title}
        className={
          phone
            ? "picker-sheet fixed inset-x-0 bottom-0 z-[120] max-h-[88svh] overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-line bg-[#03262a] px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-30px_60px_-20px_#000]"
            : `picker-pop fixed z-[120] rounded-3xl border border-line bg-[#03262a]/95 p-3 shadow-[0_40px_80px_-30px_#000,0_0_0_1px_rgb(134_207_207/0.06)] backdrop-blur-xl ${pos?.up ? "origin-bottom" : "origin-top"}`
        }
        style={phone ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, maxHeight: pos?.max, overflowY: "auto", overscrollBehavior: "contain" }}
      >
        {phone && (
          <div className="sticky top-0 z-10 -mx-4 mb-2 bg-[#03262a] px-4 pt-1 pb-2">
            <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-white/20" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-lg font-medium">{title}</p>
              <button
                type="button"
                onClick={onClose}
                className="grid size-11 cursor-pointer place-items-center rounded-full bg-white/5 text-mist hover:text-ink"
                aria-label="Fermer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </>,
    document.body,
  );
}
