import Link from "next/link";
import Icon from "@/components/Icon";
import { StatusBadge } from "@/components/ui";
import { dayNum, KIND_LABEL, money, monthShort, timeLabel } from "@/lib/format";
import type { Reservation } from "@/lib/types";

/* One reservation in a list: date block, where to where, status and price. The whole row opens it. */
export default function TripRow({ r, href, who }: { r: Reservation; href: string; who?: React.ReactNode }) {
  const past = r.status === "completed" || r.status === "cancelled";
  return (
    <Link
      prefetch={false}
      href={href}
      className={`group flex items-center gap-3 rounded-2xl border border-hair p-3 transition-colors hover:border-line hover:bg-white/[0.04] active:bg-white/[0.06] sm:gap-4 sm:p-4 ${past ? "bg-white/[0.015]" : "bg-white/[0.03]"}`}
    >
      <span className={`grid w-14 shrink-0 place-items-center rounded-xl py-2 text-center leading-none ${past ? "bg-white/5 text-mist" : "bg-deep text-ink"}`}>
        <span className="font-display text-xl font-extrabold">{dayNum(r.start_at)}</span>
        <span className="mt-1 text-[0.66rem] tracking-wider uppercase">{monthShort(r.start_at)}</span>
      </span>
      <span className="min-w-0 flex-1">
        {who}
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <span className="truncate">{r.pickup_label}</span>
          {r.dropoff_label && (
            <>
              <span className="shrink-0 text-fog" aria-hidden="true">→</span>
              <span className="truncate">{r.dropoff_label}</span>
            </>
          )}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mist">
          <span>{timeLabel(r.start_at)}</span>
          <span className="text-fog">·</span>
          <span>{KIND_LABEL[r.kind]}</span>
          {r.kind === "transfer" && r.quantity > 0 && (
            <>
              <span className="text-fog">·</span>
              <span>{Math.round(r.quantity)} km</span>
            </>
          )}
          <span className="text-fog max-sm:hidden">·</span>
          <span className="font-display tracking-wider text-fog max-sm:hidden">{r.reference}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-display text-sm font-extrabold tabular-nums sm:text-base">{money(r.total_price, r.currency)}</span>
        <StatusBadge status={r.status} />
      </span>
      <span className="shrink-0 text-fog transition-transform group-hover:translate-x-0.5 max-sm:hidden">
        <Icon name="chevron" size={18} />
      </span>
    </Link>
  );
}
