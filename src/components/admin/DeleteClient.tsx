"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteClientAction } from "@/app/actions/admin";
import { Notice } from "@/components/ui";

/* Two taps to delete. A client with reservations stays: the bookings are the agency's history. */
export default function DeleteClient({ id, name, bookings, compact = false }: { id: number; name: string; bookings: number; compact?: boolean }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (bookings > 0)
    return compact ? null : (
      <p className="rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs text-fog">
        Suppression impossible : {bookings} réservation{bookings > 1 ? "s" : ""} à son nom, gardée{bookings > 1 ? "s" : ""} dans l&apos;historique. Bloquez-le si besoin.
      </p>
    );

  return (
    <div className="flex flex-col gap-2">
      {!ask ? (
        <button type="button" className="btn btn--ghost min-h-11 w-full text-[#f5b39a] hover:border-coral/60" onClick={() => setAsk(true)}>
          Supprimer ce client
        </button>
      ) : (
        <div className="rounded-2xl border border-coral/40 bg-coral/10 p-3 text-sm">
          <p>
            Supprimer définitivement <b>{name}</b> ? Son compte et ses notifications seront effacés.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn--ghost min-h-11" onClick={() => setAsk(false)} disabled={busy}>
              Garder
            </button>
            <button
              type="button"
              disabled={busy}
              className="min-h-11 cursor-pointer rounded-full bg-coral px-4 text-sm font-semibold text-[#2a0f05] disabled:opacity-60"
              onClick={async () => {
                setBusy(true);
                setError("");
                const r = await deleteClientAction(id);
                setBusy(false);
                if (!r.ok) return setError(r.error);
                router.push("/admin/clients");
                router.refresh();
              }}
            >
              {busy ? "…" : "Supprimer"}
            </button>
          </div>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
