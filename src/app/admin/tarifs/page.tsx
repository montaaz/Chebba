import type { Metadata } from "next";
import { deletePlaceAction } from "@/app/actions/admin";
import PageHeader from "@/components/app/PageHeader";
import PlaceForm from "@/components/admin/PlaceForm";
import SettingsForm from "@/components/admin/SettingsForm";
import { PANEL } from "@/components/ui";
import { one, query } from "@/lib/server/db";
import type { Place, Settings } from "@/lib/types";

export const metadata: Metadata = { title: "Tarifs & configuration" };

const KIND: Record<Place["kind"], string> = { airport: "Aéroport", agency: "Agence", city: "Ville", hotel: "Hôtel", port: "Port" };

export default async function Page() {
  // read straight from the table: the admin must always see the saved values, never a cached copy
  const [settings, places] = await Promise.all([
    one<Settings>("SELECT * FROM settings WHERE id = 1"),
    query<Place>("SELECT * FROM places ORDER BY sort_order, id"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administration" title="Tarifs & configuration" sub="Tout ce qui détermine le prix payé par le client se règle ici." />

      <SettingsForm settings={settings!} />

      <section className={PANEL}>
        <h2 className="text-base">Lieux fréquents</h2>
        <p className="mt-1 mb-5 text-sm text-mist">Proposés en un clic dans la réservation.</p>
        <ul className="mb-6 flex flex-col divide-y divide-hair">
          {places.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-1 text-sm">
              <span>
                {p.name} <span className="text-xs text-fog">· {KIND[p.kind]}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="text-xs text-fog tabular-nums max-sm:hidden">
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                </span>
                <form action={deletePlaceAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="min-h-11 cursor-pointer px-2 text-sm text-[#f5b39a] hover:underline" type="submit" aria-label={`Supprimer ${p.name}`}>
                    Supprimer
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
        <PlaceForm />
      </section>
    </div>
  );
}
