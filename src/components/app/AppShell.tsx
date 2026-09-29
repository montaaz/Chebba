import { one } from "@/lib/server/db";
import { unreadCount } from "@/lib/server/notify";
import type { User } from "@/lib/types";
import AppNav from "./AppNav";

/* Frame of every logged-in page: navigation + a content column sized for reading. */
export default async function AppShell({ user, area, children }: { user: User; area: "client" | "admin"; children: React.ReactNode }) {
  const [unread, pending] = await Promise.all([
    unreadCount(user),
    area === "admin"
      ? one<{ n: number }>("SELECT count(*)::int AS n FROM reservations WHERE status = 'pending'").then((r) => r?.n ?? 0)
      : Promise.resolve(0),
  ]);
  return (
    <div className="min-h-svh bg-[radial-gradient(80%_50%_at_100%_0%,rgb(4_71_75/0.35),transparent_60%)] lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <AppNav area={area} user={{ full_name: user.full_name, email: user.email, role: user.role }} unread={unread} pending={pending} />
      <main className="mx-auto w-full max-w-[1180px] min-w-0 px-(--pad) pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pt-7 lg:px-10 lg:pt-10 lg:pb-14">
        {children}
      </main>
    </div>
  );
}
