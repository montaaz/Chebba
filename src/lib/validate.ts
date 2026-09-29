/* Small hand-rolled validators: same rules on the client and the server. */

export const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";

export const isEmail = (v: string) => v.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export const isPhone = (v: string) => /^\+?[\d\s().-]{8,24}$/.test(v) && v.replace(/\D/g, "").length >= 8;

export const isName = (v: string) => v.length >= 2 && v.length <= 80;

export const isPassword = (v: unknown): v is string => typeof v === "string" && v.length >= 8 && v.length <= 200;

export const toInt = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export const toAmount = (v: unknown, max = 1_000_000): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 1000) / 1000 : null;
};

/* "2026-10-01T14:30" typed in Tunisia → the matching instant */
export const toLocalDate = (v: unknown, offset: string): Date | null => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00${offset}`);
  return Number.isNaN(d.getTime()) ? null : d;
};
