"use client";

import { useEffect, useId, useRef, useState } from "react";
import Popover from "./Popover";

export type Option = { value: string; label: string; hint?: string };

type Props = {
  options: Option[];
  /* controlled … */
  value?: string;
  onChange?: (v: string) => void;
  /* … or uncontrolled inside a form: the choice is posted under `name` */
  name?: string;
  defaultValue?: string;
  label: string;
  className?: string;
};

/* Dropdown in the site's style, keyboard- and screen-reader friendly; a bottom sheet on phones. */
export default function Select({ options, value, onChange, name, defaultValue, label, className = "" }: Props) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const chosen = options.find((o) => o.value === current);

  const pick = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
    wrap.current?.querySelector("button")?.focus();
  };

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    requestAnimationFrame(() => list.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    const n = options.length;
    if (e.key === "ArrowDown") setActive((a) => Math.min(n - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Enter" || e.key === " ") pick(options[active].value);
    else if (e.key.length === 1) {
      // type the first letters of an option to jump to it
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={wrap} className="relative min-w-0">
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} : ${chosen?.label ?? ""}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 text-left ${open ? "border-aqua! bg-aqua/10!" : ""} ${className}`}
      >
        <span className="min-w-0 truncate">{chosen?.label ?? "—"}</span>
        <svg className={`shrink-0 text-fog transition-transform ${open ? "rotate-180" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={wrap} title={label} width={Math.max(240, wrap.current?.offsetWidth ?? 240)}>
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-o${active}`}
          onKeyDown={onKey}
          className="flex max-h-[min(22rem,60svh)] flex-col gap-0.5 overflow-y-auto outline-none"
        >
          {options.map((o, i) => {
            const on = o.value === current;
            return (
              <li
                key={o.value}
                id={`${id}-o${i}`}
                data-i={i}
                role="option"
                aria-selected={on}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o.value)}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2 transition-colors ${i === active ? "bg-white/8" : ""} ${on ? "text-ink" : "text-ink/85"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className={`block ${on ? "font-semibold" : ""}`}>{o.label}</span>
                  {o.hint && <span className="block text-xs text-fog">{o.hint}</span>}
                </span>
                <span className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-aqua text-[#02211f]" : "border border-hair"}`} aria-hidden="true">
                  {on && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5 10 17l9-10" />
                    </svg>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}
