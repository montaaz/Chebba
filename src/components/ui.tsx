import { STATUS_LABEL } from "@/lib/format";
import type { Status } from "@/lib/types";

export const INPUT =
  "min-h-12 w-full rounded-xl border border-hair bg-white/5 px-4 py-3 text-base outline-none transition-colors scheme-dark placeholder:text-fog focus:border-aqua focus:bg-aqua/10 disabled:opacity-50";
export const LABEL = "text-[0.68rem] font-semibold tracking-[0.18em] text-mist uppercase";
export const FIELD = "flex min-w-0 flex-col gap-1.5";
export const PANEL = "rounded-3xl border border-line bg-night-2/70 p-[clamp(1.1rem,2.6vw,1.8rem)]";
export const CARD = "rounded-2xl border border-hair bg-white/[0.03]";
export const LINK = "text-aqua underline-offset-4 hover:underline";
/* a text link with a thumb-sized hit area */
export const TAP = "inline-flex min-h-11 items-center";
export const CHECK = "flex min-h-11 cursor-pointer items-center gap-2.5 text-sm";

/* Status is never colour alone: every badge carries its label and a shape. */
const STATUS_STYLE: Record<Status, { cls: string; mark: string }> = {
  pending: { cls: "border-[#e8b86d]/40 bg-[#e8b86d]/10 text-[#f3d6a4]", mark: "◔" },
  confirmed: { cls: "border-aqua/40 bg-aqua/10 text-aqua", mark: "✓" },
  ongoing: { cls: "border-[#8fb4ff]/40 bg-[#8fb4ff]/10 text-[#b9d0ff]", mark: "▶" },
  completed: { cls: "border-[#7fd6a0]/40 bg-[#7fd6a0]/10 text-[#a6e6bf]", mark: "●" },
  cancelled: { cls: "border-coral/40 bg-coral/10 text-[#f5b39a]", mark: "✕" },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${s.cls}`}
    >
      <span aria-hidden="true">{s.mark}</span>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Notice({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === "error" ? "border-coral/40 bg-coral/10 text-[#ffc9b4]" : "border-aqua/40 bg-aqua/10 text-aqua"
      }`}
    >
      {children}
    </p>
  );
}
