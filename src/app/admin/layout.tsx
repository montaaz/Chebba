import type { Metadata } from "next";
import AppShell from "@/components/app/AppShell";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AppShell user={user} area="admin">
      {children}
    </AppShell>
  );
}
