import type { Metadata } from "next";
import AppShell from "@/components/app/AppShell";
import Avatar from "@/components/app/Avatar";
import PageHeader from "@/components/app/PageHeader";
import Icon from "@/components/Icon";
import PasswordForm from "@/components/PasswordForm";
import ProfileForm from "@/components/ProfileForm";
import { PANEL } from "@/components/ui";
import { dateOnly } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { one } from "@/lib/server/db";

export const metadata: Metadata = { title: "Mon profil", robots: { index: false } };

export default async function Page() {
  const user = await requireUser("/compte/profil");
  const since = await one<{ created_at: Date }>("SELECT created_at FROM users WHERE id = $1", [user.id]);
  return (
    <AppShell user={user} area={user.role === "admin" ? "admin" : "client"}>
      <PageHeader eyebrow="Compte" title="Mon profil" />
      <section className={`${PANEL} mb-5 flex items-center gap-4`}>
        <Avatar name={user.full_name} size={64} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.full_name}</p>
          <p className="truncate text-sm text-mist">{user.email}</p>
          {since && <p className="mt-1 text-xs text-fog">Client depuis le {dateOnly(since.created_at)}</p>}
        </div>
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className={PANEL}>
          <h2 className="mb-4 flex items-center gap-2 text-base">
            <Icon name="user" size={19} /> Coordonnées
          </h2>
          <ProfileForm name={user.full_name} phone={user.phone} email={user.email} />
        </section>
        <section className={PANEL}>
          <h2 className="mb-4 flex items-center gap-2 text-base">
            <Icon name="lock" size={19} /> Sécurité
          </h2>
          <PasswordForm />
        </section>
      </div>
    </AppShell>
  );
}
