"use client";

import { useEffect, useId, useRef, useState } from "react";
import { INPUT, LABEL } from "@/components/ui";
import { locateMe } from "@/lib/locate";
import type { Point } from "@/lib/types";

type Props = {
  label: string;
  badge: "A" | "B";
  value: Point | null;
  placeholder: string;
  onChange: (p: Point | null) => void;
  onFocus?: () => void;
  /* show a button that fills the field with the phone's position */
  locate?: boolean;
};

/* Address search with suggestions, limited to the service area by the server. */
export default function PlaceInput({ label, badge, value, placeholder, onChange, onFocus, locate }: Props) {
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [items, setItems] = useState<Point[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const typed = useRef(false);

  const fillMyPosition = async () => {
    setLocating(true);
    setError("");
    setOpen(false);
    try {
      const p = await locateMe();
      typed.current = false;
      setText(p.label);
      onChange(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLocating(false);
    }
  };

  // follow the value when it is set from outside (quick pick, map, swap, clear),
  // but never overwrite what the person is typing
  useEffect(() => {
    if (value) {
      typed.current = false;
      setText(value.label);
    } else if (!typed.current) setText("");
  }, [value]);

  useEffect(() => {
    if (!typed.current || text.trim().length < 3) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(text.trim())}`, { signal: ctrl.signal });
        const data = (await res.json()) as { places?: Point[] };
        setItems(data.places ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        /* aborted or offline: keep what is shown */
      } finally {
        setBusy(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text]);

  const choose = (p: Point) => {
    setOpen(false);
    setItems([]);
    onChange(p);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => (a + 1) % items.length));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => (a - 1 + items.length) % items.length));
    else if (e.key === "Enter") (e.preventDefault(), choose(items[active]));
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="relative flex flex-col gap-1.5">
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span
          className={`absolute top-1/2 left-3 grid size-6 -translate-y-1/2 place-items-center rounded-full text-[0.7rem] font-bold text-[#02211f] ${badge === "A" ? "bg-aqua" : "bg-sand"}`}
          aria-hidden="true"
        >
          {badge}
        </span>
        <input
          id={id}
          className={`${INPUT} min-h-13 truncate ${locate ? "pr-24" : "pr-12"} pl-11`}
          title={value?.label}
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          onFocus={() => {
            onFocus?.();
            if (items.length) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          onChange={(e) => {
            typed.current = true;
            setText(e.target.value);
            setError("");
            if (value) onChange(null);
          }}
        />
        {(text || busy) && (
          <button
            type="button"
            className={`absolute top-1/2 ${locate ? "right-12" : "right-1"} grid size-11 -translate-y-1/2 text-xl cursor-pointer place-items-center rounded-full text-mist hover:bg-white/10 hover:text-ink`}
            aria-label={`Effacer ${label.toLowerCase()}`}
            onClick={() => {
              typed.current = false;
              setText("");
              setItems([]);
              onChange(null);
            }}
          >
            {busy ? <span className="size-3 animate-spin rounded-full border-2 border-aqua border-t-transparent" /> : "×"}
          </button>
        )}
        {locate && (
          <button
            type="button"
            onClick={fillMyPosition}
            disabled={locating}
            className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-aqua hover:bg-aqua/15 disabled:cursor-progress"
            aria-label="Utiliser ma position actuelle"
            title="Utiliser ma position actuelle"
          >
            {locating ? (
              <span className="size-4 animate-spin rounded-full border-2 border-aqua border-t-transparent" />
            ) : (
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                <circle cx="12" cy="12" r="7.5" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm text-[#f5b39a]" role="alert">
          {error}
        </p>
      )}
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-[min(16rem,40svh)] overflow-auto overscroll-contain rounded-xl border border-line bg-night-2 py-1 shadow-[0_30px_60px_-20px_#000]"
        >
          {items.length === 0 && <li className="px-4 py-3 text-sm text-mist">Aucun lieu trouvé en Tunisie.</li>}
          {items.map((p, i) => (
            <li key={`${p.lat},${p.lng}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`min-h-12 w-full cursor-pointer px-4 py-3 text-left text-[0.95rem] ${i === active ? "bg-aqua/15 text-ink" : "text-mist"}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
