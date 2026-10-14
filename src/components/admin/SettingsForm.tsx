"use client";

import { useActionState, useMemo, useState } from "react";
import { saveSettingsAction, type FormState } from "@/app/actions/admin";
import Select from "@/components/pickers/Select";
import { CHECK, FIELD, INPUT, LABEL, Notice, PANEL } from "@/components/ui";
import { money } from "@/lib/format";
import { transferPrice } from "@/lib/pricing";
import type { Settings } from "@/lib/types";

type Key = keyof Settings;

export type FleetRow = {
  id: number;
  name: string;
  year: number;
  active: boolean;
  cover: string | null;
  perDay: number;
  perKm: number | null;
  rental: boolean;
  transfer: boolean;
};
type RowState = { day: string; km: string; rental: boolean; transfer: boolean };

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/* Tariff form with a live simulator: the admin sees what a client would pay
   before saving anything. Uses the very same pricing function as the site.
   Every vehicle's own prices are edited here too, next to the default km rate they fall back on. */
export default function SettingsForm({ settings, fleet }: { settings: Settings; fleet: FleetRow[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettingsAction, {});
  const [v, setV] = useState<Record<Key, string>>(
    () => Object.fromEntries(Object.entries(settings).map(([k, x]) => [k, String(x ?? "")])) as Record<Key, string>,
  );
  const [km, setKm] = useState("50");
  const [roundTrip, setRoundTrip] = useState(false);
  const [night, setNight] = useState(false);
  const [rows, setRows] = useState<Record<number, RowState>>(() =>
    Object.fromEntries(fleet.map((c) => [c.id, { day: String(c.perDay), km: c.perKm == null ? "" : String(c.perKm), rental: c.rental, transfer: c.transfer }])),
  );
  const setRow = (id: number, patch: Partial<RowState>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  const offered = fleet.filter((c) => rows[c.id].transfer);
  const [simCar, setSimCar] = useState(String((offered[0] ?? fleet[0])?.id ?? ""));
  const defaultKm = num(v.price_per_km);
  // the km rate a vehicle really uses: its own, or the default one
  const rateOf = (id: number) => (rows[id].km.trim() === "" ? defaultKm : num(rows[id].km));
  const onDefault = offered.filter((c) => rows[c.id].km.trim() === "");

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
    const id = Number(simCar);
    const own = rows[id] && rows[id].km.trim() !== "" ? num(rows[id].km) : null;
    return { price: transferPrice({ km: num(km), roundTrip, startAt: at, car: { price_per_km: own }, settings: s }), currency: s.currency };
  }, [v, km, roundTrip, night, settings, simCar, rows]);

  const cur = v.currency || "DT";

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <form action={action} className="flex flex-col gap-5">
        {fleet.length > 0 && (
          <section className={PANEL}>
            <h2 className="text-base">Tarifs par véhicule</h2>
            <p className="mt-1 mb-5 text-sm text-mist">
              Chaque véhicule a son prix à la journée et, s&apos;il fait des transferts, son prix au kilomètre. Laissez le prix au km vide pour utiliser le tarif par défaut.
            </p>
            <ul className="flex flex-col gap-2.5">
              {fleet.map((c) => {
                const r = rows[c.id];
                const rate = rateOf(c.id);
                const dayMissing = r.rental && num(r.day) <= 0;
                const kmMissing = r.transfer && rate <= 0;
                const toggle = (on: boolean) =>
                  `inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold ${on ? "text-ink" : "text-fog"}`;
                return (
                  <li key={c.id} className="grid gap-x-4 gap-y-3 rounded-2xl border border-hair bg-white/[0.03] p-3 sm:grid-cols-2">
                    <input type="hidden" name="car" value={c.id} />
                    <div className="flex min-w-0 items-center gap-3 sm:col-span-2">
                      <span className="grid h-12 w-[4.5rem] shrink-0 place-items-center overflow-hidden rounded-xl bg-deep text-[0.6rem] text-fog">
                        {c.cover ? <img src={c.cover} alt="" className="h-full w-full object-cover" loading="lazy" /> : "—"}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug break-words">{c.name}</span>
                        <span className="text-xs text-fog">
                          {c.year}
                          {!c.active && <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5">○ Masqué</span>}
                        </span>
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={toggle(r.rental)}>
                        <input type="checkbox" name={`rental_${c.id}`} checked={r.rental} onChange={(e) => setRow(c.id, { rental: e.target.checked })} className="size-5 accent-[#4c9c9d]" />
                        Location
                      </label>
                      <span className={`relative transition-opacity ${r.rental ? "" : "opacity-45"}`}>
                        <input
                          className={`${INPUT} pr-20`}
                          name={`day_${c.id}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.001"
                          required
                          value={r.day}
                          onChange={(e) => setRow(c.id, { day: e.target.value })}
                          aria-label={`${c.name} : prix par jour`}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-fog">{cur} / jour</span>
                      </span>
                      {dayMissing && <span className="text-xs text-[#f3d6a4]">⚠ Sans prix : pas réservable</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={toggle(r.transfer)}>
                        <input type="checkbox" name={`transfer_${c.id}`} checked={r.transfer} onChange={(e) => setRow(c.id, { transfer: e.target.checked })} className="size-5 accent-[#4c9c9d]" />
                        Transfert
                      </label>
                      <span className={`relative transition-opacity ${r.transfer ? "" : "opacity-45"}`}>
                        <input
                          className={`${INPUT} pr-16`}
                          name={`km_${c.id}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.001"
                          placeholder={`Défaut : ${defaultKm}`}
                          value={r.km}
                          onChange={(e) => setRow(c.id, { km: e.target.value })}
                          aria-label={`${c.name} : prix par kilomètre`}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-fog">{cur} / km</span>
                      </span>
                      {r.transfer &&
                        (kmMissing ? (
                          <span className="text-xs text-[#f3d6a4]">⚠ Aucun tarif : pas proposé en transfert</span>
                        ) : (
                          <span className="text-xs text-fog">
                            Appliqué : <b className="text-aqua tabular-nums">{money(rate, cur)} / km</b>
                            {r.km.trim() === "" ? " (défaut)" : ""}
                          </span>
                        ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className={PANEL}>
          <h2 className="text-base">Transfert au kilomètre</h2>
          <p className="mt-1 mb-5 text-sm text-mist">Prix = kilomètres × tarif du véhicule, plus les frais ci-dessous, communs à tous les véhicules.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("price_per_km", "Tarif par défaut", {
              suffix: `${cur} / km`,
              hint: onDefault.length
                ? `Utilisé par : ${onDefault.map((c) => c.name).join(", ")}.`
                : "Pour les véhicules sans tarif au km. Aucun ne l'utilise pour le moment.",
            })}
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
        {fleet.length > 0 && (
          <label className={`${FIELD} mb-3`}>
            <span className={LABEL}>Véhicule</span>
            <Select
              label="Véhicule"
              value={simCar}
              onChange={setSimCar}
              className={INPUT}
              options={fleet.map((c) => ({
                value: String(c.id),
                label: `${c.name} · ${rows[c.id].transfer && rateOf(c.id) > 0 ? `${money(rateOf(c.id), cur)}/km` : "pas en transfert"}`,
              }))}
            />
          </label>
        )}
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
        {rows[Number(simCar)] && !rows[Number(simCar)].transfer && (
          <p className="mt-3 rounded-xl bg-[#e8b86d]/10 px-3 py-2 text-xs text-[#f3d6a4]">Ce véhicule n&apos;est pas proposé en transfert : cochez « Transfert » dans le tableau pour l&apos;ouvrir.</p>
        )}
        <p className="mt-3 text-xs text-fog">Aperçu avec les valeurs saisies, avant enregistrement.</p>
      </aside>
    </div>
  );
}
