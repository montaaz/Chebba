import { dateTime, money } from "./format";
import type { Reservation, Status } from "./types";

/* wa.me wants digits only, with the country code. Local 8-digit Tunisian numbers get 216. */
export const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "").replace(/^00/, "");
  return d.length === 8 ? `216${d}` : d;
};

export const waLink = (phone: string, text: string) =>
  `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

type R = Pick<
  Reservation,
  "reference" | "kind" | "status" | "start_at" | "pickup_label" | "dropoff_label" | "total_price" | "currency" | "customer_name" | "car_name"
>;

const trip = (r: R) =>
  r.kind === "transfer" ? `${r.pickup_label} → ${r.dropoff_label}` : `Prise en charge : ${r.pickup_label}`;

const LEAD: Record<Status, string> = {
  pending: "nous avons bien reçu votre demande et revenons vers vous très vite.",
  confirmed: "votre réservation est confirmée.",
  ongoing: "votre réservation a commencé. Bonne route !",
  completed: "merci d'avoir roulé avec nous. À très bientôt !",
  cancelled: "votre réservation a été annulée. Contactez-nous pour toute question.",
};

/* what the agency sends to the client */
export const messageToClient = (r: R, brand: string) =>
  [
    `Bonjour ${r.customer_name.split(" ")[0]}, ${LEAD[r.status]}`,
    "",
    `Référence : ${r.reference}`,
    `${r.car_name} · ${dateTime(r.start_at)}`,
    trip(r),
    `Montant : ${money(r.total_price, r.currency)}`,
    "",
    brand,
  ].join("\n");

/* what the client sends to the agency right after booking */
export const messageToAgency = (r: Pick<R, "reference" | "customer_name">) =>
  `Bonjour, je viens de faire la demande ${r.reference} sur votre site (${r.customer_name}). Pouvez-vous me la confirmer ?`;
