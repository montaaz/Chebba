"use client";

import { useActionState, useMemo, useState } from "react";
import { saveSettingsAction, type FormState } from "@/app/actions/admin";
import { CHECK, FIELD, INPUT, LABEL, Notice, PANEL } from "@/components/ui";
import { money } from "@/lib/format";
import { transferPrice } from "@/lib/pricing";
import type { Settings } from "@/lib/types";

type Key = keyof Settings;

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/* Tariff form with a live simulator: the admin sees what a client would pay
   before saving anything. Uses the very same pricing function as the site. */
export default function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettingsAction, {});
  const [v, setV] = useState<Record<Key, string>>(
    () => Object.fromEntries(Object.entries(settings).map(([k, x]) => [k, String(x ?? "")])) as Record<Key, string>,
  );
  const [km, setKm] = useState("50");
  const [roundTrip, setRoundTrip] = useState(false);
  const [night, setNight] = useState(false);

  const field = (name: Key, label: string, opts: { suffix?: string; step?: string; type?: string; hint?: string } = {}) => (
    <label className={FIELD}>
      <span className={LABEL}>{label}</span>
      <span className="relative">
        <input
          className={`${INPUT} ${opts.suffix ? "pr-16" : ""}`}
          name={name}
          type={opts.type ?? "number"}
          inputMode={opts.type ? undefined : "decimal"}
          min={opts.type ? undefined : 0}
          step={opts.step ?? "0.001"}
          value={v[name]}
          onChange={(e) => setV((cur) => ({ ...cur, [name]: e.target.value }))}
        />
        {opts.suffix && <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-fog">{opts.suffix}</span>}
      </span>
      {opts.hint && <span className="text-xs text-fog">{opts.hint}</span>}
    </label>
  );

  const sim = useMemo(() => {
    const s: Settings = {
      ...settings,
      currency: v.currency || "DT",
      price_per_km: num(v.price_per_km),
      transfer_base_fee: num(v.transfer_base_fee),
      transfer_min_price: num(v.transfer_min_price),
      round_trip_discount_pct: num(v.round_trip_discount_pct),
      night_surcharge_pct: num(v.night_surcharge_pct),
      // the simulator toggles night directly instead of depending on the clock
      night_start_hour: 0,
      night_end_hour: night ? 23 : 0,
    };
    const at = new Date("2030-01-01T12:00:00+01:00");
    return { price: transferPrice({ km: num(km), roundTrip, startAt: at, car: { price_per_km: null }, settings: s }), currency: s.currency };
  }, [v, km, roundTrip, night, settings]);

  const cur = v.currency || "DT";

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <form action={action} className="flex flex-col gap-5">
        <section className={PANEL}>
          <h2 className="text-base">Transfert au kilomètre</h2>
          <p className="mt-1 mb-5 text-sm text-mist">Prix = kilomètres × tarif, plus les frais ci-dessous.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("price_per_km", "Prix par kilomètre", { suffix: `${cur} / km`, hint: "Un véhicule peut avoir son propre tarif." })}
            {field("transfer_base_fee", "Prise en charge", { suffix: cur, hint: "Ajoutée à chaque transfert." })}
            {field("transfer_min_price", "Prix minimum", { suffix: cur, hint: "Aucun transfert ne coûte moins." })}
            {field("round_trip_discount_pct", "Remise aller-retour", { suffix: "%", step: "0.01" })}
            {field("night_surcharge_pct", "Majoration de nuit", { suffix: "%", step: "0.01" })}
            <div className="grid grid-cols-2 gap-3">
              {field("night_start_hour", "Nuit : début", { suffix: "h", step: "1" })}
              {field("night_end_hour", "Nuit : fin", { suffix: "h", step: "1" })}
            </div>
          </div>
        </section>

        <section className={PANEL}>
          <h2 className="mb-5 text-base">Règles de réservation</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {field("min_lead_hours", "Délai minimum", { suffix: "heures", step: "1", hint: "Avant le départ." })}
            {field("max_transfer_km", "Distance maximale", { suffix: "km", step: "1" })}
            {field("currency", "Devise", { type: "text" })}
          </div>
        </section>

        <section className={PANEL}>
          <h2 className="mb-5 text-base">Coordonnées affichées sur le site</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {field("contact_phone", "Téléphone", { type: "tel" })}
            {field("contact_whatsapp", "WhatsApp", { type: "tel", hint: "Avec l'indicatif, ex. 216…" })}
            {field("contact_email", "E-mail", { type: "email" })}
          </div>
        </section>

        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.saved && <Notice tone="ok">Configuration enregistrée. Les nouveaux prix sont en ligne.</Notice>}
        <button className="btn btn--solid min-h-12 sm:self-start" type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer la configuration"}
        </button>
      </form>

      <aside className={`${PANEL} max-xl:order-first xl:sticky xl:top-24`}>
        <p className="eyebrow">Simulateur</p>
        <h2 className="mt-2 mb-4 text-base">Ce que paiera le client</h2>
        <label className={FIELD}>
          <span className={LABEL}>Distance du trajet</span>
          <span className="relative">
            <input className={`${INPUT} pr-12`} type="number" inputMode="decimal" min={0} step="1" value={km} onChange={(e) => setKm(e.target.value)} />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-fog">km</span>
          </span>
        </label>
        <div className="mt-2 flex flex-wrap gap-x-6">
          <label className={CHECK}>
            <input type="checkbox" className="size-5 accent-[#4c9c9d]" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
            Aller-retour
          </label>
          <label className={CHECK}>
            <input type="checkbox" className="size-5 accent-[#4c9c9d]" checked={night} onChange={(e) => setNight(e.target.checked)} />
            De nuit
          </label>
        </div>
        <ul className="mt-5 flex flex-col gap-1.5 border-t border-hair pt-4 text-sm text-mist">
          {sim.price.lines.map((l) => (
            <li key={l.label} className="flex justify-between gap-3">
              <span>{l.label}</span>
              <span className="tabular-nums">{money(l.amount, sim.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-end justify-between border-t border-hair pt-4">
          <span className="text-sm text-mist">Total</span>
          <span className="font-display text-3xl font-extrabold text-sand tabular-nums">{money(sim.price.total, sim.currency)}</span>
        </p>
        <p className="mt-3 text-xs text-fog">Aperçu avec les valeurs saisies, avant enregistrement.</p>
      </aside>
    </div>
  );
}
