import { TIME_ZONE } from "./pricing";
import type { Kind, Status } from "./types";

export const money = (n: number, currency: string) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${currency}`;

export const dateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(d));

export const dateOnly = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: TIME_ZONE }).format(
    new Date(d),
  );

const rel = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
/* "il y a 5 minutes", "hier" — falls back to the date after a week */
export const ago = (d: Date | string) => {
  const s = (new Date(d).getTime() - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 60) return "à l'instant";
  if (a < 3600) return rel.format(Math.round(s / 60), "minute");
  if (a < 86_400) return rel.format(Math.round(s / 3600), "hour");
  if (a < 7 * 86_400) return rel.format(Math.round(s / 86_400), "day");
  return dateOnly(d);
};

/* "dans 2 j", "dans 5 h", "maintenant", "il y a 3 j" — for departures */
export const until = (d: Date | string) => {
  const m = Math.round((new Date(d).getTime() - Date.now()) / 60_000);
  const a = Math.abs(m);
  const txt = a < 60 ? `${a} min` : a < 24 * 60 ? `${Math.round(a / 60)} h` : `${Math.round(a / 1440)} j`;
  if (a < 5) return "maintenant";
  return m > 0 ? `dans ${txt}` : `il y a ${txt}`;
};

/* "mer. 01 oct." and "14:50" in Tunisian time */
export const dayLabel = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "short", timeZone: TIME_ZONE }).format(new Date(d));
export const timeLabel = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(new Date(d));
export const dayNum = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: TIME_ZONE }).format(new Date(d));
export const monthShort = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: TIME_ZONE }).format(new Date(d)).replace(".", "");

export const duration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
};

export const STATUS_LABEL: Record<Status, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  ongoing: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const KIND_LABEL: Record<Kind, string> = { rental: "Location", transfer: "Transfert" };

/* which statuses an admin may move a reservation to */
export const NEXT_STATUS: Record<Status, Status[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ongoing", "completed", "cancelled"],
  ongoing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const carName = (c: { make: string; model: string; trim_level: string }) =>
  [c.make, c.model, c.trim_level].filter(Boolean).join(" ");
