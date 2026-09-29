import { decodePolyline } from "@/lib/polyline";

type Props = {
  polyline: string;
  from: { lat: number | null; lng: number | null };
  to: { lat: number | null; lng: number | null };
  className?: string;
};

/* The stored route drawn as a small vector sketch: no map tiles to download,
   renders on the server, crisp at any size. */
export default function RouteSketch({ polyline, from, to, className = "" }: Props) {
  let pts: [number, number][] = polyline ? decodePolyline(polyline) : [];
  if (pts.length < 2 && from.lat != null && from.lng != null && to.lat != null && to.lng != null)
    pts = [[from.lat, from.lng], [to.lat, to.lng]];
  if (pts.length < 2) return null;
  if (pts.length > 160) pts = pts.filter((_, i) => i % Math.ceil(pts.length / 160) === 0 || i === pts.length - 1);

  const W = 400, H = 240, PAD = 34;
  const k = Math.cos((pts[0][0] * Math.PI) / 180);
  const xs = pts.map((p) => p[1] * k), ys = pts.map((p) => -p[0]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min((W - PAD * 2) / Math.max(x1 - x0, 1e-6), (H - PAD * 2) / Math.max(y1 - y0, 1e-6));
  const ox = (W - (x1 - x0) * scale) / 2, oy = (H - (y1 - y0) * scale) / 2;
  const P = pts.map((_, i) => [ox + (xs[i] - x0) * scale, oy + (ys[i] - y0) * scale] as [number, number]);
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  if (P.length === 2) {
    // no road geometry: a gentle arc instead of a ruler line
    const [[ax, ay], [bx, by]] = P;
    d += ` Q${((ax + bx) / 2 - (by - ay) * 0.2).toFixed(1)} ${((ay + by) / 2 + (bx - ax) * 0.2).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  } else for (const [x, y] of P.slice(1)) d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
  const [a, b] = [P[0], P[P.length - 1]];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Tracé de l'itinéraire">
      <defs>
        <pattern id="rs-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="rgb(255 255 255 / 0.05)" />
        </pattern>
        <radialGradient id="rs-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0" stopColor="#4c9c9d" stopOpacity="0.22" />
          <stop offset="1" stopColor="#4c9c9d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#rs-grid)" />
      <rect width={W} height={H} fill="url(#rs-glow)" />
      <path d={d} fill="none" stroke="#021a1c" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#86cfcf" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {[[a, "A", "#86cfcf"], [b, "B", "#ffe4d3"]].map(([p, l, c]) => {
        const [x, y] = p as [number, number];
        return (
          <g key={l as string}>
            <circle cx={x} cy={y} r="13" fill={c as string} stroke="#021a1c" strokeWidth="3" />
            <text x={x} y={y + 4.5} textAnchor="middle" fontSize="12" fontWeight="800" fill="#02211f">
              {l as string}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
