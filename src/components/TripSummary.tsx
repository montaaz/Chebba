import { dateTime, duration, KIND_LABEL, money } from "@/lib/format";
import type { Reservation } from "@/lib/types";

/* The A → B block shared by the client area and the admin. */
export default function TripSummary({ r }: { r: Reservation }) {
  return (
    <div className="flex flex-col gap-3">
      <ol className="relative flex flex-col gap-3 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-line">
        <li className="relative">
          <span className="absolute top-1.5 -left-6 size-[11px] rounded-full bg-aqua" aria-hidden="true" />
          <p className="text-sm">{r.pickup_label}</p>
          <p className="text-xs text-fog">{dateTime(r.start_at)}</p>
        </li>
        {(r.dropoff_label || r.kind === "rental") && (
          <li className="relative">
            <span className="absolute top-1.5 -left-6 size-[11px] rounded-full bg-sand" aria-hidden="true" />
            <p className="text-sm">{r.kind === "rental" ? "Retour du véhicule" : r.dropoff_label}</p>
            <p className="text-xs text-fog">{r.kind === "rental" ? dateTime(r.end_at) : r.round_trip ? "Aller-retour" : "Aller simple"}</p>
          </li>
        )}
      </ol>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mist">
        <span>{KIND_LABEL[r.kind]}</span>
        <span>{r.car_name}</span>
        {r.kind === "transfer" ? (
          <>
            <span>{r.quantity.toLocaleString("fr-FR")} km</span>
            <span>{duration(r.duration_min * (r.round_trip ? 2 : 1))}</span>
            <span>{money(r.unit_price, r.currency)} / km</span>
          </>
        ) : (
          <span>
            {r.quantity} jour{r.quantity > 1 ? "s" : ""} × {money(r.unit_price, r.currency)}
          </span>
        )}
        <span>
          {r.passengers} passager{r.passengers > 1 ? "s" : ""}
        </span>
      </p>
    </div>
  );
}
