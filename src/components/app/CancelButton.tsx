"use client";

import { useState } from "react";
import { cancelAction } from "@/app/actions/booking";

/* Two taps: a cancellation can't be undone, so it is never one accidental tap away. */
export default function CancelButton({ id }: { id: number }) {
  const [ask, setAsk] = useState(false);
  if (!ask)
    return (
      <button type="button" className="btn btn--ghost min-h-12 text-[#f5b39a]" onClick={() => setAsk(true)}>
        Annuler la réservation
      </button>
    );
  return (
    <form action={cancelAction} className="rounded-2xl border border-coral/35 bg-coral/10 p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm">Annuler cette réservation ? Cette action est définitive.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn--ghost min-h-11 flex-1" onClick={() => setAsk(false)}>
          Garder
        </button>
        <button type="submit" className="btn min-h-11 flex-1 bg-coral font-semibold text-[#2a0f05]">
          Oui, annuler
        </button>
      </div>
    </form>
  );
}
