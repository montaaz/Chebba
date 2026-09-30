/* Calendar dates as "YYYY-MM-DD" strings in the visitor's local time — no time zone surprises. */
const p2 = (n: number) => String(n).padStart(2, "0");

export const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const fromYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = fromYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const today = () => ymd(new Date());
export const daysBetween = (a: string, b: string) => Math.round((fromYmd(b).getTime() - fromYmd(a).getTime()) / 86_400_000);

const long = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const full = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/* "mer. 1 oct." */
export const shortDate = (s: string) => long.format(fromYmd(s)).replace(/\./g, "");
export const fullDate = (s: string) => full.format(fromYmd(s));
export const monthTitle = (d: Date) => {
  const t = monthFmt.format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/* "YYYY-MM-DDTHH:mm" helpers */
export const splitDT = (v: string) => (v ? { date: v.slice(0, 10), time: v.slice(11, 16) } : { date: "", time: "" });
export const joinDT = (date: string, time: string) => `${date}T${time}`;
