/* Initials on a tint picked from the name, so the same person always gets the same colour. */
const TINTS = [
  "bg-[#0e5c61] text-[#b9eded]",
  "bg-[#1d4f6b] text-[#c4e3f5]",
  "bg-[#3d4f2a] text-[#dcebc4]",
  "bg-[#5a3d2b] text-[#f6dcc9]",
  "bg-[#4a3560] text-[#e3d4f3]",
  "bg-[#2c5647] text-[#c9efe0]",
];

export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${TINTS[h % TINTS.length]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
