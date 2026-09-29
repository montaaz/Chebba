import { NextResponse } from "next/server";
import { clientIp } from "@/lib/server/auth";
import { BookingError, offersFor, resolveTrip } from "@/lib/server/booking";
import { allow } from "@/lib/server/geo";
import { getSettings } from "@/lib/server/settings";

/* Price preview. The same functions price the real booking, so the two never differ. */
export async function POST(req: Request) {
  if (!allow(`quote:${await clientIp()}`, 60)) return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  try {
    const raw = body as Record<string, unknown>;
    const settings = await getSettings();
    const timed = typeof raw.startAt === "string" && raw.startAt !== "";
    const trip = await resolveTrip(raw, settings, false);
    return NextResponse.json({
      route: trip.route,
      roundTrip: trip.roundTrip,
      currency: settings.currency,
      offers: await offersFor(trip, settings, timed),
    });
  } catch (err) {
    if (err instanceof BookingError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error("quote failed", err);
    return NextResponse.json({ error: "Calcul impossible pour le moment." }, { status: 500 });
  }
}
