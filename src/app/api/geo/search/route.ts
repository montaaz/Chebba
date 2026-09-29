import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "@/lib/server/auth";
import { allow, inArea, reversePlace, searchPlaces } from "@/lib/server/geo";

export async function GET(req: NextRequest) {
  if (!allow(`geo:${await clientIp()}`, 90)) return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  const params = req.nextUrl.searchParams;
  if (params.has("lat")) {
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    if (!inArea(lat, lng)) return NextResponse.json({ error: "Ce point est hors de la zone desservie." }, { status: 422 });
    return NextResponse.json({ place: await reversePlace(lat, lng) });
  }
  const q = params.get("q") ?? "";
  try {
    return NextResponse.json(
      { places: await searchPlaces(q) },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch {
    return NextResponse.json({ places: [], error: "Recherche indisponible." }, { status: 502 });
  }
}
