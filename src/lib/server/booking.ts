import "server-only";
import { randomInt } from "node:crypto";
import { isUniqueViolation, one, query, transaction } from "./db";
import { getRoute, inArea } from "./geo";
import { mailCreated, notifyAdmins } from "./notify";
import { getActiveCars, getSettings } from "./settings";
import { rentalPrice, transferPrice, TZ_OFFSET } from "../pricing";
import { clean, toInt, toLocalDate } from "../validate";
import { KIND_LABEL, carName, dateTime, money } from "../format";
import type { Car, Kind, Point, Price, Reservation, Route, Settings, User } from "../types";

const HOLDING = ["pending", "confirmed", "ongoing"];
const TRANSFER_BUFFER_MIN = 30;

export class BookingError extends Error {}

export type Trip = {
  kind: Kind;
  startAt: Date;
  endAt: Date;
  pickup: Point;
  dropoff: Point | null;
  roundTrip: boolean;
  route: Route | null;
};

export type Offer = { carId: number; price: Price; available: boolean };

const toPoint = (v: unknown): Point | null => {
  if (typeof v !== "object" || v === null) return null;
  const { label, lat, lng } = v as Record<string, unknown>;
  const name = clean(label, 200);
  return name && inArea(lat, lng) ? { label: name, lat: lat as number, lng: lng as number } : null;
};

/* Turns untrusted input into a checked trip. Distances always come from the
   routing server here — never from the browser. */
export async function resolveTrip(raw: Record<string, unknown>, s: Settings, strictDates = true): Promise<Trip> {
  const kind: Kind = raw.kind === "rental" ? "rental" : "transfer";
  const pickup = toPoint(raw.pickup);
  if (!pickup) throw new BookingError("Choisissez un lieu de départ en Tunisie.");

  const start = toLocalDate(raw.startAt, TZ_OFFSET);
  if (strictDates || start) {
    if (!start) throw new BookingError("Indiquez la date et l'heure de départ.");
    if (start.getTime() < Date.now() + s.min_lead_hours * 3_600_000)
      throw new BookingError(
        s.min_lead_hours
          ? `Le départ doit être prévu au moins ${s.min_lead_hours} h à l'avance.`
          : "La date de départ est déjà passée.",
      );
    if (start.getTime() > Date.now() + 366 * 86_400_000)
      throw new BookingError("Les réservations sont ouvertes jusqu'à un an à l'avance.");
  }
  const startAt = start ?? new Date(Date.now() + 86_400_000);

  if (kind === "rental") {
    const endAt = toLocalDate(raw.endAt, TZ_OFFSET);
    if (!endAt || endAt <= startAt) throw new BookingError("La date de retour doit être après le départ.");
    if (endAt.getTime() - startAt.getTime() > 180 * 86_400_000)
      throw new BookingError("Pour une location de plus de 6 mois, contactez-nous directement.");
    return { kind, startAt, endAt, pickup, dropoff: toPoint(raw.dropoff), roundTrip: false, route: null };
  }

  const dropoff = toPoint(raw.dropoff);
  if (!dropoff) throw new BookingError("Choisissez une destination en Tunisie.");
  let route: Route;
  try {
    route = await getRoute(pickup, dropoff);
  } catch {
    throw new BookingError("Impossible de calculer l'itinéraire pour le moment. Réessayez dans un instant.");
  }
  if (route.km < 0.3) throw new BookingError("Le départ et la destination sont identiques.");
  if (route.km > s.max_transfer_km)
    throw new BookingError(`Ce trajet dépasse la distance maximale (${s.max_transfer_km} km).`);

  const roundTrip = raw.roundTrip === true;
  const minutes = route.minutes * (roundTrip ? 2 : 1) + TRANSFER_BUFFER_MIN;
  return { kind, startAt, endAt: new Date(startAt.getTime() + minutes * 60_000), pickup, dropoff, roundTrip, route };
}

export const priceTrip = (trip: Trip, car: Car, s: Settings, timed = true): Price =>
  trip.kind === "rental"
    ? rentalPrice({ from: trip.startAt, to: trip.endAt, car, currency: s.currency })
    : transferPrice({
        km: trip.route!.km,
        roundTrip: trip.roundTrip,
        startAt: timed ? trip.startAt : null,
        car,
        settings: s,
      });

/* offered for this service AND priced for it: a missing tariff must never turn into a free booking */
export const eligible = (car: Car, kind: Kind, s: Pick<Settings, "price_per_km">) =>
  kind === "rental" ? car.for_rental && car.price_per_day > 0 : car.for_transfer && (car.price_per_km ?? s.price_per_km) > 0;

/* One grouped query tells how many units of each car are taken over the period. */
export async function offersFor(trip: Trip, s: Settings, timed = true): Promise<Offer[]> {
  const cars = (await getActiveCars()).filter((c) => eligible(c, trip.kind, s));
  const busy = await query<{ car_id: number; n: number }>(
    `SELECT car_id, count(*)::int AS n FROM reservations
      WHERE status = ANY($1) AND start_at < $3 AND end_at > $2
      GROUP BY car_id`,
    [HOLDING, trip.startAt, trip.endAt],
  );
  const taken = new Map(busy.map((b) => [b.car_id, b.n]));
  return cars.map((car) => ({
    carId: car.id,
    price: priceTrip(trip, car, s, timed),
    available: (taken.get(car.id) ?? 0) < car.units,
  }));
}

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const reference = () => "CAC-" + Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export async function createReservation(
  user: User,
  raw: Record<string, unknown>,
): Promise<{ id: number; reference: string; total: number; currency: string }> {
  const s = await getSettings();
  const trip = await resolveTrip(raw, s);

  const carId = toInt(raw.carId, 1, 2_147_483_647);
  const car = (await getActiveCars()).find((c) => c.id === carId);
  if (!car || !eligible(car, trip.kind, s)) throw new BookingError("Ce véhicule n'est plus disponible.");

  const passengers = toInt(raw.passengers, 1, 60) ?? 1;
  if (passengers > car.seats - (trip.kind === "transfer" ? 1 : 0))
    throw new BookingError(`Ce véhicule accepte ${car.seats - (trip.kind === "transfer" ? 1 : 0)} passagers au maximum.`);

  const name = clean(raw.customerName, 80) || user.full_name;
  const phone = clean(raw.customerPhone, 24) || user.phone;
  const note = clean(raw.note, 500);
  const price = priceTrip(trip, car, s);

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const done = await transaction(async (db) => {
        // serialises bookings of the same car so two clients cannot take the last unit
        await db.query("SELECT pg_advisory_xact_lock($1, $2)", [7301, car.id]);
        const { rows } = await db.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM reservations
            WHERE car_id = $1 AND status = ANY($2) AND start_at < $4 AND end_at > $3`,
          [car.id, HOLDING, trip.startAt, trip.endAt],
        );
        if (rows[0].n >= car.units) throw new BookingError("Ce véhicule vient d'être réservé sur ce créneau.");

        const ref = reference();
        const inserted = await db.query<{ id: number }>(
          `INSERT INTO reservations
             (reference, user_id, car_id, kind, start_at, end_at,
              pickup_label, pickup_lat, pickup_lng, dropoff_label, dropoff_lat, dropoff_lng,
              distance_km, duration_min, route_polyline, round_trip, passengers,
              unit_price, quantity, fees, total_price, currency, customer_name, customer_phone, note)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
           RETURNING id`,
          [
            ref, user.id, car.id, trip.kind, trip.startAt, trip.endAt,
            trip.pickup.label, trip.pickup.lat, trip.pickup.lng,
            trip.dropoff?.label ?? "", trip.dropoff?.lat ?? null, trip.dropoff?.lng ?? null,
            trip.route?.km ?? 0, trip.route?.minutes ?? 0, trip.route?.polyline ?? "",
            trip.roundTrip, passengers,
            price.unitPrice, price.quantity, price.fees, price.total, s.currency, name, phone, note,
          ],
        );
        await db.query(
          "INSERT INTO reservation_events (reservation_id, actor_id, to_status, note) VALUES ($1, $2, 'pending', 'Demande créée')",
          [inserted.rows[0].id, user.id],
        );
        await notifyAdmins(db, {
          reservationId: inserted.rows[0].id,
          kind: "created",
          title: `Nouvelle demande · ${KIND_LABEL[trip.kind]}`,
          body: `${name} · ${dateTime(trip.startAt)} · ${carName(car)} · ${money(price.total, s.currency)}`,
        });
        return { id: inserted.rows[0].id, reference: ref, total: price.total, currency: s.currency };
      });
      // only after the commit: no e-mail for a booking that was rolled back
      const saved = await reservationById(done.id);
      if (saved) await mailCreated(saved, user.email).catch((e) => console.error("[mail]", e));
      return done;
    } catch (err) {
      if (isUniqueViolation(err, "reservations_reference_key")) continue;
      throw err;
    }
  }
  throw new BookingError("Réservation impossible pour le moment. Réessayez.");
}

const SELECT = `
  SELECT r.*, concat_ws(' ', c.make, c.model, nullif(c.trim_level, '')) AS car_name
    FROM reservations r JOIN cars c ON c.id = r.car_id`;

export const reservationsOf = (userId: number, limit = 50) =>
  query<Reservation>(`${SELECT} WHERE r.user_id = $1 ORDER BY r.id DESC LIMIT $2`, [userId, limit]);

export const reservationById = (id: number) => one<Reservation>(`${SELECT} WHERE r.id = $1`, [id]);

export type Filters = { view?: "upcoming" | "all"; status?: string; kind?: string; q?: string; cursor?: string };

/* Keyset pagination: "rows after the last one seen" stays fast at any depth, unlike OFFSET
   which rescans everything it skips. "upcoming" pages by departure time, "all" by newest first. */
export async function listReservations(f: Filters, pageSize = 25) {
  const where: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => `$${params.push(v)}`;
  const upcoming = f.view !== "all";
  if (upcoming) where.push("r.status IN ('pending', 'confirmed', 'ongoing')", "r.end_at >= now()");
  if (f.status) where.push(`r.status = ${p(f.status)}`);
  if (f.kind) where.push(`r.kind = ${p(f.kind)}`);
  if (f.q) {
    const exact = p(f.q.toUpperCase()), like = p(`%${f.q.replace(/[%_\\]/g, "\\$&")}%`);
    where.push(`(r.reference = ${exact} OR r.customer_phone ILIKE ${like} OR r.customer_name ILIKE ${like})`);
  }
  if (f.cursor) {
    if (upcoming) {
      const [t, id] = f.cursor.split("_");
      const at = new Date(Number(t));
      if (!Number.isNaN(at.getTime()) && Number(id) > 0) where.push(`(r.start_at, r.id) > (${p(at)}, ${p(Number(id))})`);
    } else if (Number(f.cursor) > 0) where.push(`r.id < ${p(Number(f.cursor))}`);
  }
  const rows = await query<Reservation>(
    `${SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY ${upcoming ? "r.start_at, r.id" : "r.id DESC"} LIMIT ${p(pageSize + 1)}`,
    params,
  );
  const more = rows.length > pageSize;
  const last = rows[pageSize - 1];
  return {
    rows: rows.slice(0, pageSize),
    next: more ? (upcoming ? `${last.start_at.getTime()}_${last.id}` : String(last.id)) : null,
  };
}
