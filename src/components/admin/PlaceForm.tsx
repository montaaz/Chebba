"use client";

import { useActionState } from "react";
import { savePlaceAction, type FormState } from "@/app/actions/admin";
import { FIELD, INPUT, LABEL, Notice } from "@/components/ui";

export default function PlaceForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(savePlaceAction, {});
  return (
    <form action={action} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] [&>label:first-child]:max-sm:col-span-2 [&>label:nth-child(2)]:max-sm:col-span-2 [&>button]:max-sm:col-span-2">
      <label className={FIELD}>
        <span className={LABEL}>Nom du lieu</span>
        <input className={INPUT} name="name" maxLength={80} required placeholder="Hôtel, agence…" />
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Type</span>
        <select className={INPUT} name="kind" defaultValue="city">
          <option className="bg-night-2" value="airport">Aéroport</option>
          <option className="bg-night-2" value="agency">Agence</option>
          <option className="bg-night-2" value="city">Ville</option>
          <option className="bg-night-2" value="hotel">Hôtel</option>
          <option className="bg-night-2" value="port">Port</option>
        </select>
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Latitude</span>
        <input className={INPUT} name="lat" type="number" inputMode="decimal" step="any" required placeholder="36.8510" />
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Longitude</span>
        <input className={INPUT} name="lng" type="number" inputMode="decimal" step="any" required placeholder="10.2272" />
      </label>
      <button className="btn btn--ghost" type="submit" disabled={pending}>
        Ajouter
      </button>
      {state.error && (
        <div className="sm:col-span-5">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
    </form>
  );
}
