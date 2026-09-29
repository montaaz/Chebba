import { dateOnly, money } from "@/lib/format";

type Day = { day: Date; n: number; revenue: number };

/* Single series: reservations received per day. One hue, today picked out,
   value on hover / focus, and the same figures available as a table. */
export default function DayBars({ days, currency }: { days: Day[]; currency: string }) {
  const top = Math.max(...days.map((d) => d.n));
  const max = Math.max(4, Math.ceil(top / 2) * 2);
  const short = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: "Africa/Tunis" }).format(d);
  return (
    <figure>
      <div className="flex gap-2">
        <div className="flex h-44 flex-col justify-between pb-0 text-right text-[0.66rem] text-fog tabular-nums" aria-hidden="true">
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>
        <div className="relative flex h-44 flex-1 items-end gap-[3px] border-b border-line sm:gap-1.5">
          <span className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-hair" />
          <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-hair" />
          {days.map((d, i) => {
            const today = i === days.length - 1;
            return (
              <div key={d.day.toISOString()} className="group relative flex h-full flex-1 items-end justify-center outline-none" tabIndex={0}>
                <span
                  className={`w-full max-w-7 rounded-t-[4px] transition-colors ${today ? "bg-aqua" : "bg-teal/80 group-hover:bg-teal group-focus:bg-teal"}`}
                  style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n ? 3 : 0 }}
                />
                <span className="pointer-events-none absolute bottom-full z-10 mb-2 hidden -translate-x-0 rounded-xl border border-line bg-night px-3 py-2 text-xs whitespace-nowrap shadow-xl group-hover:block group-focus:block">
                  <b className="block text-ink">{dateOnly(d.day)}</b>
                  <span className="text-mist">
                    {d.n} réservation{d.n > 1 ? "s" : ""} · {money(d.revenue, currency)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-[3px] pl-6 text-center text-[0.62rem] text-fog tabular-nums sm:gap-1.5" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.day.toISOString()} className={`flex-1 ${i % 2 && i !== days.length - 1 ? "max-sm:invisible" : ""} ${i === days.length - 1 ? "font-semibold text-aqua" : ""}`}>
            {i === days.length - 1 ? "Auj." : short(d.day)}
          </span>
        ))}
      </div>
      <details className="mt-3 text-xs text-mist">
        <summary className="flex min-h-11 cursor-pointer items-center hover:text-ink">▸ Voir les chiffres</summary>
        <table className="mt-2 w-full max-w-sm text-left tabular-nums">
          <thead>
            <tr className="text-fog">
              <th className="py-1 font-normal">Jour</th>
              <th className="py-1 font-normal">Réservations</th>
              <th className="py-1 font-normal">Montant</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day.toISOString()} className="border-t border-hair">
                <td className="py-1">{dateOnly(d.day)}</td>
                <td className="py-1">{d.n}</td>
                <td className="py-1">{money(d.revenue, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
