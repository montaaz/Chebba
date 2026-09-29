import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import Wizard from "@/components/booking/Wizard";
import { getUser } from "@/lib/server/auth";
import { getActiveCars, getActivePlaces, getSettings } from "@/lib/server/settings";

export const metadata: Metadata = {
  title: "Réserver — transfert ou location",
  description: "Calculez le prix de votre transfert au kilomètre ou de votre location, et réservez en trois étapes.",
};
export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const [user, cars, places, settings] = await Promise.all([getUser(), getActiveCars(), getActivePlaces(), getSettings()]);
  const day = (v: unknown) => (typeof v === "string" && DATE.test(v) ? `${v}T10:00` : "");

  return (
    <>
      <SiteHeader />
      <main className="wrap py-[clamp(1.5rem,4vw,3rem)]">
        <Wizard
          cars={cars}
          places={places}
          user={user ? { full_name: user.full_name, phone: user.phone } : null}
          currency={settings.currency}
          minLeadHours={settings.min_lead_hours}
          whatsapp={settings.contact_whatsapp}
          initial={{ kind: q.mode === "location" ? "rental" : "transfer", startAt: day(q.from), endAt: day(q.to) }}
        />
      </main>
    </>
  );
}
