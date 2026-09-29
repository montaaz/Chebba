/* Pure pricing rules — shared by the quote API and the booking itself,
   so the price shown is always the price stored. */
import type { Car, Price, PriceLine, Settings } from "./types";

/* Tunisia is UTC+1 all year, no daylight saving. */
export const TZ_OFFSET = "+01:00";
export const TIME_ZONE = "Africa/Tunis";

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });

export const localHour = (at: Date) =>
  Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: TIME_ZONE }).format(at)) % 24;

export const isNight = (at: Date, s: Pick<Settings, "night_start_hour" | "night_end_hour">) => {
  const h = localHour(at);
  const { night_start_hour: from, night_end_hour: to } = s;
  if (from === to) return false;
  return from < to ? h >= from && h < to : h >= from || h < to;
};

export const kmRate = (car: Pick<Car, "price_per_km">, s: Pick<Settings, "price_per_km">) =>
  car.price_per_km ?? s.price_per_km;

export function transferPrice(input: {
  km: number;
  roundTrip: boolean;
  startAt: Date | null;
  car: Pick<Car, "price_per_km">;
  settings: Settings;
}): Price {
  const { km, roundTrip, startAt, car, settings: s } = input;
  const rate = kmRate(car, s);
  const quantity = Math.round(km * (roundTrip ? 2 : 1) * 100) / 100;
  const distance = round3(quantity * rate);
  const lines: PriceLine[] = [
    { label: `${fr(quantity)} km${roundTrip ? " (aller-retour)" : ""} × ${fr(rate)} ${s.currency}/km`, amount: distance },
  ];
  let total = distance;

  if (roundTrip && s.round_trip_discount_pct > 0) {
    const off = round3((distance * s.round_trip_discount_pct) / 100);
    lines.push({ label: `Remise aller-retour (${fr(s.round_trip_discount_pct)} %)`, amount: -off });
    total -= off;
  }
  if (s.transfer_base_fee > 0) {
    lines.push({ label: "Prise en charge", amount: s.transfer_base_fee });
    total += s.transfer_base_fee;
  }
  if (startAt && s.night_surcharge_pct > 0 && isNight(startAt, s)) {
    const extra = round3((total * s.night_surcharge_pct) / 100);
    lines.push({ label: `Majoration de nuit (${fr(s.night_surcharge_pct)} %)`, amount: extra });
    total += extra;
  }
  if (total < s.transfer_min_price) {
    lines.push({ label: "Complément tarif minimum", amount: round3(s.transfer_min_price - total) });
    total = s.transfer_min_price;
  }

  total = round3(total);
  return { unitPrice: rate, quantity, fees: round3(total - distance), total, lines };
}

export const rentalDays = (from: Date, to: Date) =>
  Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000 - 1e-9));

export function rentalPrice(input: { from: Date; to: Date; car: Pick<Car, "price_per_day">; currency?: string }): Price {
  const days = rentalDays(input.from, input.to);
  const total = round3(days * input.car.price_per_day);
  return {
    unitPrice: input.car.price_per_day,
    quantity: days,
    fees: 0,
    total,
    lines: [{ label: `${days} jour${days > 1 ? "s" : ""} × ${fr(input.car.price_per_day)} ${input.currency ?? "DT"}/jour`, amount: total }],
  };
}
