import { setStatusAction } from "@/app/actions/admin";
import Icon from "@/components/Icon";

/* One-tap confirm / refuse for a pending reservation, usable inside lists. */
export default function QuickActions({ id, compact = false }: { id: number; compact?: boolean }) {
  return (
    <div className="flex shrink-0 gap-1.5">
      <form action={setStatusAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="cancelled" />
        <input type="hidden" name="note" value="Refusée depuis la liste" />
        <button
          type="submit"
          className="grid size-11 cursor-pointer place-items-center rounded-full border border-hair text-mist transition-colors hover:border-coral/50 hover:text-[#f5b39a]"
          aria-label="Refuser"
          title="Refuser"
        >
          <Icon name="close" size={18} />
        </button>
      </form>
      <form action={setStatusAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="confirmed" />
        <button
          type="submit"
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-linear-to-br from-aqua to-teal font-semibold text-[#02211f] ${compact ? "w-11" : "px-4 text-sm"}`}
          aria-label="Confirmer"
          title="Confirmer"
        >
          <Icon name="check" size={18} />
          {!compact && "Confirmer"}
        </button>
      </form>
    </div>
  );
}
