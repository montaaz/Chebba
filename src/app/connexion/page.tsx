import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import BottomNav from "@/components/BottomNav";
import SiteHeader from "@/components/SiteHeader";
import { getUser, safeNext } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getUser()) redirect(next);
  return (
    <>
      <SiteHeader />
      <main className="wrap grid place-items-center py-8 md:min-h-[calc(100svh-4.5rem)] md:py-10">
        <AuthForm mode="login" next={next} />
      </main>
      <BottomNav />
    </>
  );
}
