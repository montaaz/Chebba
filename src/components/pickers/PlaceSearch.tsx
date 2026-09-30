"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";

export type Spot = { label: string; lat: number; lng: number; kind?: string };

type Props = {
  frequent: Spot[];
  /* the place on the other end of the trip, which cannot be chosen twice */
  exclude?: Spot | null;
  current?: Spot | null;
  onPick: (p: Spot) => void;
  placeholder: string;
};

const RECENT_KEY = "chebba:recent-places";
const KIND: Record<string, { icon: string; group: string }> = {
  airport: { icon: "✈", group: "Aéroports" },
  port: { icon: "⚓", group: "Ports" },
  agency: { icon: "◆", group: "Agences" },
  hotel: { icon: "★", group: "Hôtels" },
  city: { icon: "●", group: "Villes" },
};
const same = (a?: Spot | null, b?: Spot | null) => !!a && !!b && Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lng - b.lng) < 1e-4;

const readRecent = (): Spot[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((p) => typeof p?.label === "string" && Number.isFinite(p?.lat) && Number.isFinite(p?.lng)).slice(0, 4) : [];
  } catch {
    return [];
  }
};
const saveRecent = (p: Spot) => {
  try {
    const list = [p, ...readRecent().filter((r) => !same(r, p))].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* private mode or storage blocked: recents are only a convenience */
  }
};

/* "Hôtel X, Rue Y, Sousse" → title "Hôtel X", detail "Rue Y, Sousse" */
const split = (label: string) => {
  const i = label.indexOf(",");
  return i < 0 ? { title: label, detail: "" } : { title: label.slice(0, i), detail: label.slice(i + 1).trim() };
};

/* Search any address in the service area, use the phone's position, or pick a recent / frequent place. */
export default function PlaceSearch({ frequent, exclude, current, onPick, placeholder }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Spot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [recent, setRecent] = useState<Spot[]>([]);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(readRecent());
    // the keyboard comes up straight away: searching is the main action
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setError("");
    setActive(-1);
    const term = q.trim();
    if (term.length < 3) {
      setResults([]);
      setBusy(false);
      return;
    }
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { places?: Spot[]; error?: string };
        setResults(data.places ?? []);
        if (!res.ok) setError(data.error ?? "Recherche indisponible.");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Connexion perdue.");
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 280);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const pick = (p: Spot) => {
    saveRecent({ label: p.label, lat: p.lat, lng: p.lng });
    onPick(p);
  };

  const locate = () => {
    if (!navigator.geolocation) return setError("La localisation n'est pas disponible sur cet appareil.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/geo/search?lat=${pos.coords.latitude.toFixed(5)}&lng=${pos.coords.longitude.toFixed(5)}`);
          const data = await res.json();
          if (!res.ok) setError(data.error ?? "Position introuvable.");
          else pick({ ...data.place, label: data.place.label.startsWith("Point sur la carte") ? "Ma position" : data.place.label });
        } catch {
          setError("Connexion perdue.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setError(err.code === err.PERMISSION_DENIED ? "Autorisez la localisation dans votre navigateur pour utiliser votre position." : "Position introuvable pour le moment.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const searching = q.trim().length >= 3;
  const onKey = (e: React.KeyboardEvent) => {
    if (!searching || !results.length) return;
    if (e.key === "ArrowDown") setActive((a) => Math.min(results.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(-1, a - 1));
    else if (e.key === "Enter" && active >= 0) pick(results[active]);
    else return;
    e.preventDefault();
  };

  const row = (p: Spot, key: string, icon: React.ReactNode, on: boolean, i?: number) => {
    const { title, detail } = split(p.label);
    const blocked = same(p, exclude);
    return (
      <li key={key}>
        <button
          type="button"
          disabled={blocked}
          onClick={() => pick(p)}
          onPointerEnter={() => i !== undefined && setActive(i)}
          className={`flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-1.5 text-left transition-colors disabled:cursor-default disabled:opacity-35 ${on ? "bg-aqua/15" : i !== undefined && i === active ? "bg-white/[0.08]" : "hover:bg-white/[0.07]"}`}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-sm text-aqua" aria-hidden="true">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate ${on ? "font-semibold" : "font-medium"}`}>{title}</span>
            {detail && <span className="block truncate text-xs text-fog">{detail}</span>}
            {blocked && <span className="block text-xs text-fog">Déjà choisi comme autre point</span>}
          </span>
          {on && (
            <span className="text-aqua">
              <Icon name="check" size={18} />
            </span>
          )}
        </button>
      </li>
    );
  };

  const groups = Object.entries(frequent.reduce<Record<string, Spot[]>>((g, p) => ((g[KIND[p.kind ?? ""]?.group ?? "Lieux"] ??= []).push(p), g), {}));

  return (
    // a steady height on phones: the sheet must not jump while results come and go
    <div className="flex flex-col gap-3 max-md:min-h-[62svh]">
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-aqua">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={placeholder}
          aria-controls="place-results"
          className="min-h-13 w-full rounded-2xl border border-line bg-black/25 pr-12 pl-11 text-base outline-none transition-colors placeholder:text-fog focus:border-aqua focus:bg-aqua/[0.07] [&::-webkit-search-cancel-button]:hidden"
        />
        {(q || busy) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              input.current?.focus();
            }}
            className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-mist hover:text-ink"
            aria-label="Effacer la recherche"
          >
            {busy ? <span className="size-4 animate-spin rounded-full border-2 border-aqua border-t-transparent" /> : "✕"}
          </button>
        )}
      </div>

      {error && <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm text-[#f5b39a]">{error}</p>}

      {searching ? (
        <ul id="place-results" role="listbox" aria-label="Résultats" className="flex flex-col gap-0.5">
          {results.map((p, i) => row(p, `${p.lat},${p.lng}`, <Icon name="pin" size={18} />, same(p, current), i))}
          {!busy && !results.length && !error && (
            <li className="rounded-2xl bg-white/[0.03] px-4 py-6 text-center text-sm text-mist">
              Aucun lieu trouvé en Tunisie pour « {q.trim()} ».
              <span className="mt-1 block text-xs text-fog">Essayez un nom de ville, de quartier ou d&apos;hôtel.</span>
            </li>
          )}
        </ul>
      ) : (
        <>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-2xl border border-aqua/30 bg-aqua/[0.08] px-2.5 text-left transition-colors hover:bg-aqua/15 disabled:cursor-progress"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-aqua text-[#02211f]">
              {locating ? (
                <span className="size-4 animate-spin rounded-full border-2 border-[#02211f] border-t-transparent" />
              ) : (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                  <circle cx="12" cy="12" r="7.5" />
                </svg>
              )}
            </span>
            <span>
              <span className="block font-semibold">{locating ? "Localisation…" : "Utiliser ma position"}</span>
              <span className="block text-xs text-mist">Idéal si l&apos;on vient vous chercher là où vous êtes</span>
            </span>
          </button>

          {recent.length > 0 && (
            <div>
              <p className="mb-1 px-1 text-[0.66rem] font-semibold tracking-[0.18em] text-fog uppercase">Récents</p>
              <ul className="flex flex-col gap-0.5">{recent.map((p) => row(p, `r${p.lat},${p.lng}`, <Icon name="clock" size={17} />, same(p, current)))}</ul>
            </div>
          )}

          {groups.map(([g, list]) => (
            <div key={g}>
              <p className="mb-1 px-1 text-[0.66rem] font-semibold tracking-[0.18em] text-fog uppercase">{g}</p>
              <ul className="flex flex-col gap-0.5">{list.map((p) => row(p, `f${p.lat},${p.lng}`, KIND[p.kind ?? ""]?.icon ?? "●", same(p, current)))}</ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
