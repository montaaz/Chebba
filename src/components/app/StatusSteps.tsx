import type { Status } from "@/lib/types";

const STEPS: { key: Status; label: string }[] = [
  { key: "pending", label: "Demande" },
  { key: "confirmed", label: "Confirmée" },
  { key: "ongoing", label: "En cours" },
  { key: "completed", label: "Terminée" },
];

/* Where the reservation stands, as a tracker — the step name is always written, never colour alone. */
export default function StatusSteps({ status }: { status: Status }) {
  if (status === "cancelled")
    return (
      <p className="flex items-center gap-2.5 rounded-2xl border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-[#f5b39a]">
        <span className="grid size-6 place-items-center rounded-full bg-coral/25 text-xs font-bold" aria-hidden="true">
          ✕
        </span>
        Réservation annulée
      </p>
    );
  const at = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Avancement de la réservation">
      {STEPS.map((s, i) => {
        const done = i < at || status === "completed";
        const now = i === at && status !== "completed";
        return (
          <li key={s.key} className="min-w-0" aria-current={now ? "step" : undefined}>
            <span className={`block h-1.5 rounded-full ${done ? "bg-teal" : now ? "bg-aqua" : "bg-white/10"}`} />
            <span className={`mt-2 flex items-center gap-1 text-[0.72rem] sm:text-xs ${done || now ? "text-ink" : "text-fog"} ${now ? "font-semibold" : ""}`}>
              {done && <span aria-hidden="true">✓</span>}
              <span className="truncate">{s.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
