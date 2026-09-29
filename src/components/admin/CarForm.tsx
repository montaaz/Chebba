"use client";

import { useActionState } from "react";
import { saveCarAction, type FormState } from "@/app/actions/admin";
import { CHECK, FIELD, INPUT, LABEL, Notice } from "@/components/ui";
import type { Car } from "@/lib/types";

type Props = { car?: Car; currency: string; kmRate: number; images: string[] };

export default function CarForm({ car, currency, kmRate, images }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCarAction, {});
  const text = (name: keyof Car, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`${FIELD} ${["make", "model", "price_per_day", "price_per_km"].includes(name) ? "max-sm:col-span-2" : ""}`}>
      <span className={LABEL}>{label}</span>
      <input className={INPUT} name={name} inputMode={props.type === "number" ? "decimal" : undefined} defaultValue={car?.[name] == null ? "" : String(car[name])} {...props} />
    </label>
  );
  const check = (name: keyof Car, label: string, fallback = true) => (
    <label className={CHECK}>
      <input type="checkbox" name={name} className="size-5 accent-[#4c9c9d]" defaultChecked={car ? Boolean(car[name]) : fallback} />
      {label}
    </label>
  );

  return (
    // the key resets the "add" form after a successful save
    <form action={action} key={state.saved && !car ? Date.now() : "form"} className="flex flex-col gap-4">
      {car && <input type="hidden" name="id" value={car.id} />}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {text("make", "Marque", { required: true, maxLength: 40 })}
        {text("model", "Modèle", { required: true, maxLength: 40 })}
        {text("trim_level", "Finition", { maxLength: 40 })}
        {text("model_year", "Année", { type: "number", min: 1990, max: 2100, required: true })}
        {text("price_per_day", `Prix par jour (${currency})`, { type: "number", min: 0, step: "0.001", required: true })}
        {text("price_per_km", `Prix par km (${currency})`, { type: "number", min: 0, step: "0.001", placeholder: `Tarif global : ${kmRate}` })}
        {text("seats", "Places", { type: "number", min: 1, max: 60, required: true })}
        {text("luggage", "Bagages", { type: "number", min: 0, max: 60, required: true })}
        {text("units", "Exemplaires en parc", { type: "number", min: 0, max: 1000, required: true })}
        {text("sort_order", "Ordre d'affichage", { type: "number" })}
        <label className={FIELD}>
          <span className={LABEL}>Boîte</span>
          <select className={INPUT} name="transmission" defaultValue={car?.transmission ?? "automatic"}>
            <option className="bg-night-2" value="automatic">Automatique</option>
            <option className="bg-night-2" value="manual">Manuelle</option>
          </select>
        </label>
        <label className={FIELD}>
          <span className={LABEL}>Énergie</span>
          <select className={INPUT} name="fuel" defaultValue={car?.fuel ?? "petrol"}>
            <option className="bg-night-2" value="petrol">Essence</option>
            <option className="bg-night-2" value="diesel">Diesel</option>
            <option className="bg-night-2" value="hybrid">Hybride</option>
            <option className="bg-night-2" value="electric">Électrique</option>
          </select>
        </label>
        <label className={FIELD}>
          <span className={LABEL}>Photo</span>
          <select className={INPUT} name="image" defaultValue={car?.image ?? ""}>
            <option className="bg-night-2" value="">Aucune</option>
            {images.map((i) => (
              <option className="bg-night-2" key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-x-6">
        {check("is_active", "Visible sur le site")}
        {check("for_transfer", "Proposé en transfert")}
        {check("for_rental", "Proposé en location")}
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.saved && <Notice tone="ok">Véhicule enregistré.</Notice>}
      <button className="btn btn--ghost self-start" type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : car ? "Enregistrer" : "Ajouter le véhicule"}
      </button>
    </form>
  );
}
