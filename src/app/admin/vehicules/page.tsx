import type { Metadata } from "next";
import PageHeader from "@/components/app/PageHeader";
import CarForm from "@/components/admin/CarForm";
import Icon from "@/components/Icon";
import Picture from "@/components/Picture";
import { PANEL } from "@/components/ui";
import { carName, money } from "@/lib/format";
import manifest from "@/lib/images.json";
import { one, query } from "@/lib/server/db";
import type { Car, Settings } from "@/lib/types";

export const metadata: Metadata = { title: "Véhicules" };

type Row = Car & { active_bookings: number };

export default async function Page() {
  const [cars, settings] = await Promise.all([
    query<Row>(`
      SELECT c.*, (SELECT count(*)::int FROM reservations r
                    WHERE r.car_id = c.id AND r.status IN ('pending', 'confirmed', 'ongoing')) AS active_bookings
        FROM cars c ORDER BY c.sort_order, c.id`),
    one<Settings>("SELECT * FROM settings WHERE id = 1"),
  ]);
  const s = settings!;
  const images = Object.keys(manifest);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Véhicules" sub={`${cars.filter((c) => c.is_active).length} en ligne · ${cars.reduce((t, c) => t + c.units, 0)} exemplaires en parc`}>
        <a href="#ajouter" className="btn btn--solid min-h-12">
          <Icon name="plus" size={18} /> Ajouter
        </a>
      </PageHeader>

      <div className="flex flex-col gap-4">
        {cars.map((c) => {
          const perKm = c.price_per_km ?? s.price_per_km;
          const warn = (c.for_rental && !c.price_per_day) || (c.for_transfer && !perKm);
          return (
            <details key={c.id} className="group overflow-hidden rounded-3xl border border-line bg-night-2/70">
              <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-5 [&::-webkit-details-marker]:hidden">
                <span className="grid h-20 w-28 place-items-center overflow-hidden rounded-2xl bg-linear-to-br from-deep to-night sm:h-24 sm:w-36">
                  {c.image && c.image in manifest ? (
                    <Picture name={c.image} alt="" sizes="144px" className="w-full object-contain" />
                  ) : (
                    <span className="text-fog">
                      <Icon name="car" size={30} />
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-medium">{carName(c)}</span>
                    <span className="text-xs text-fog">{c.model_year}</span>
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span className={`rounded-full px-2.5 py-1 ${c.is_active ? "bg-[#7fd6a0]/12 text-[#a6e6bf]" : "bg-white/5 text-fog"}`}>{c.is_active ? "● En ligne" : "○ Masqué"}</span>
                    {c.for_transfer && <span className="rounded-full bg-white/5 px-2.5 py-1 text-mist">Transfert</span>}
                    {c.for_rental && <span className="rounded-full bg-white/5 px-2.5 py-1 text-mist">Location</span>}
                    {warn && <span className="rounded-full bg-[#e8b86d]/12 px-2.5 py-1 text-[#f3d6a4]">⚠ Tarif manquant</span>}
                  </span>
                </span>
                <span className="col-span-2 grid grid-cols-3 gap-2 text-center sm:col-span-1 sm:flex sm:gap-5 sm:text-right">
                  <span>
                    <span className="block text-[0.68rem] text-fog">Par jour</span>
                    <span className="font-semibold tabular-nums">{c.price_per_day ? money(c.price_per_day, s.currency) : "—"}</span>
                  </span>
                  <span>
                    <span className="block text-[0.68rem] text-fog">Par km{c.price_per_km == null ? " (global)" : ""}</span>
                    <span className="font-semibold tabular-nums">{perKm ? money(perKm, s.currency) : "—"}</span>
                  </span>
                  <span>
                    <span className="block text-[0.68rem] text-fog">Actives</span>
                    <span className="font-semibold tabular-nums">
                      {c.active_bookings} / {c.units}
                    </span>
                  </span>
                </span>
                <span className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold text-aqua sm:col-span-3 sm:justify-self-start sm:px-5">
                  <span className="group-open:hidden">Modifier</span>
                  <span className="hidden group-open:inline">Fermer</span>
                </span>
              </summary>
              <div className="border-t border-hair p-4 sm:p-6">
                <CarForm car={c} currency={s.currency} kmRate={s.price_per_km} images={images} />
              </div>
            </details>
          );
        })}

        <section id="ajouter" className={`${PANEL} scroll-mt-24`}>
          <h2 className="mb-5 flex items-center gap-2 text-base">
            <Icon name="plus" size={19} /> Ajouter un véhicule
          </h2>
          <CarForm currency={s.currency} kmRate={s.price_per_km} images={images} />
        </section>
      </div>
    </>
  );
}
