/* ============================================================
   Image pipeline — turns the raw source photos (project root)
   into small AVIF + WebP files in public/img.

   Run:  npm run images
   ============================================================ */
import sharp from "sharp";
import { mkdir, rm, stat, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "img");
/* Original photos live outside the project (they show real number plates and are not published).
   Override with IMAGES_SRC=/path/to/folder npm run images */
const SRC_DIR = process.env.IMAGES_SRC ?? path.join(ROOT, "..", "cars-photos-originales");
const src = (n) => path.join(SRC_DIR, n === 1 ? "Pasted image.png" : `Pasted image (${n}).png`);

/* Text shown on every car's number plate. Registration numbers are never published. */
const PLATE_TEXT = "CHEBBA AUTO CAR";

/* crop  = [left, top, right, bottom] insets removing screenshot borders
   plate = the four corners of the number plate in the SOURCE photo, in pixels,
           clockwise from top-left. Any photo showing a plate must declare it. */
const PHOTOS = [
  // exterior — the four angles used by the scroll showroom
  { name: "ext-front", n: 1, crop: [4, 22, 6, 14], widths: [640, 1100], upscale: true, plate: [[279, 245], [341, 245], [341, 259], [279, 259]] },
  { name: "ext-front34", n: 2, crop: [4, 24, 6, 18], widths: [640, 1100], upscale: true, plate: [[254, 254.5], [290.5, 255], [290.5, 267], [254, 265.5]] },
  { name: "ext-rear34", n: 4, crop: [4, 24, 6, 18], widths: [640, 1100], upscale: true, plate: [[215, 266.5], [267, 268.5], [266, 281], [214, 279.5]] },
  { name: "ext-rear", n: 3, crop: [4, 24, 6, 18], widths: [640, 1100], upscale: true, plate: [[286, 252.5], [354, 252.5], [354, 267.5], [286, 267.5]] },
  { name: "ext-grille", n: 5, crop: [4, 24, 6, 18], widths: [480, 900], upscale: true, plate: [[345.4, 247.8], [524.2, 215.4], [521.4, 256.8], [344.2, 289.8]] },
  // interior
  { name: "int-ambient", n: 6, crop: [32, 18, 26, 26], widths: [720, 1400] },
  { name: "int-dashboard", n: 7, crop: [6, 2, 2, 12], widths: [640, 1200] },
  { name: "int-cockpit", n: 11, crop: [0, 0, 0, 0], widths: [480, 900] },
  { name: "int-screen", n: 12, crop: [0, 0, 0, 0], widths: [480, 900] },
  { name: "int-console", n: 13, crop: [0, 0, 0, 0], widths: [480, 900] },
  { name: "int-climate", n: 14, crop: [0, 0, 0, 0], widths: [480, 900] },
  { name: "int-seat", n: 15, crop: [4, 30, 4, 24], widths: [480, 840] },
];

async function cropped(file, [l, t, r, b]) {
  const meta = await sharp(file).metadata();
  return sharp(file)
    .extract({ left: l, top: t, width: meta.width - l - r, height: meta.height - t - b })
    .removeAlpha();
}

const MANIFEST = {};

async function emit(pipeline, name, width, { alpha = false } = {}) {
  const base = path.join(OUT, `${name}-${width}`);
  const buf = await pipeline.toBuffer();
  const meta = await sharp(buf).metadata();
  const entry = (MANIFEST[name] ??= { widths: [], width: 0, height: 0 });
  entry.widths.push(width);
  if (width > entry.width) Object.assign(entry, { width: meta.width, height: meta.height });
  const avif = await sharp(buf).avif({ quality: alpha ? 50 : 46, effort: 7 }).toBuffer();
  const webp = await sharp(buf).webp({ quality: alpha ? 74 : 68, effort: 6, alphaQuality: 80 }).toBuffer();
  await writeFile(`${base}.avif`, avif);
  await writeFile(`${base}.webp`, webp);
  // version tag from the image content: browsers keep images for a year, so any change
  // to a picture must change its address or visitors keep seeing the old one
  entry.hash = createHash("sha1").update(entry.hash ?? "").update(avif).update(webp).digest("hex");
  entry.v = entry.hash.slice(0, 8);
}

/* ------------------------------------------------------------
   Number plates. The brand plate is drawn flat, then projected
   onto the four corners of the real plate so it follows the
   car's angle, and tinted with the light of the original plate
   so it sits in the photo instead of looking pasted on.
   ------------------------------------------------------------ */
function plateArt(width, badge) {
  const W = 1040, H = 220, band = badge ? 0 : 84;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${width}" height="${Math.round((width * H) / W)}">
    <rect width="${W}" height="${H}" rx="22" fill="#fff"/>
    ${band ? `<path d="M22 0H${band}V${H}H22A22 22 0 0 1 0 ${H - 22}V22A22 22 0 0 1 22 0Z" fill="#04474b"/>
    <circle cx="${band / 2}" cy="${H / 2}" r="22" fill="none" stroke="#86cfcf" stroke-width="8"/>` : ""}
    <rect x="5" y="5" width="${W - 10}" height="${H - 10}" rx="18" fill="none" stroke="#16181b" stroke-width="${badge ? 7 : 9}"/>
    <text x="${band + (W - band) / 2}" y="${badge ? 143 : 144}" font-family="DejaVu Sans Condensed, DejaVu Sans" font-weight="bold"
      font-size="${badge ? 84 : 88}" fill="#16181b" text-anchor="middle" letter-spacing="${badge ? 3 : 0}">${PLATE_TEXT}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

/* maps the unit square onto a quadrilateral (Heckbert); returned as the inverse, quad → square */
function quadToSquare([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  // adjugate of [[a,b,c],[d,e,f],[g,h,1]]
  const A = e - f * h, B = c * h - b, C = b * f - c * e;
  const D = f * g - d, E = a - c * g, F = c * d - a * f;
  const G = d * h - e * g, H = b * g - a * h, I = a * e - b * d;
  return (x, y) => {
    const w = G * x + H * y + I;
    return [(A * x + B * y + C) / w, (D * x + E * y + F) / w];
  };
}

/* px: raw RGB(A) pixels, edited in place. quad: plate corners in this image's pixels. */
async function coverPlate(px, W, H, channels, quad, { badge = false, grow = 1.2 } = {}) {
  // push the corners outwards a little so the soft edge of the old plate is covered too
  const cx = quad.reduce((t, p) => t + p[0], 0) / 4, cy = quad.reduce((t, p) => t + p[1], 0) / 4;
  const q = quad.map(([x, y]) => {
    const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy);
    return [x + (dx / len) * grow, y + (dy / len) * grow];
  });
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  const bx0 = Math.max(0, Math.floor(Math.min(...xs)) - 1), bx1 = Math.min(W - 1, Math.ceil(Math.max(...xs)) + 1);
  const by0 = Math.max(0, Math.floor(Math.min(...ys)) - 1), by1 = Math.min(H - 1, Math.ceil(Math.max(...ys)) + 1);
  const inv = quadToSquare(q);

  // light of the scene: the brightest part of the old plate is its paper colour
  const lum = [];
  for (let y = by0; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++) {
      const [u, v] = inv(x + 0.5, y + 0.5);
      if (u < 0.15 || u > 0.95 || v < 0.1 || v > 0.9) continue;
      const i = (y * W + x) * channels;
      lum.push([px[i] + px[i + 1] + px[i + 2], px[i], px[i + 1], px[i + 2]]);
    }
  lum.sort((m, n) => n[0] - m[0]);
  const top = lum.slice(0, Math.max(1, Math.round(lum.length * 0.3)));
  const paper = [1, 2, 3].map((k) => top.reduce((t, p) => t + p[k], 0) / top.length / 255);

  const tw = Math.max(96, Math.round(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) * 2.5));
  const { data: art, info } = await plateArt(tw, badge);
  const sample = (u, v, k) => {
    const fx = Math.min(info.width - 1.001, Math.max(0, u * info.width - 0.5));
    const fy = Math.min(info.height - 1.001, Math.max(0, v * info.height - 0.5));
    const ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy;
    const at = (X, Y) => art[(Y * info.width + X) * info.channels + k];
    return (at(ix, iy) * (1 - ax) + at(ix + 1, iy) * ax) * (1 - ay) + (at(ix, iy + 1) * (1 - ax) + at(ix + 1, iy + 1) * ax) * ay;
  };

  const N = 4; // 4×4 samples per pixel: smooth edges and smooth small lettering
  for (let y = by0; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++) {
      let hit = 0;
      const sum = [0, 0, 0];
      for (let sy = 0; sy < N; sy++)
        for (let sx = 0; sx < N; sx++) {
          const [u, v] = inv(x + (sx + 0.5) / N, y + (sy + 0.5) / N);
          if (u < 0 || u > 1 || v < 0 || v > 1) continue;
          hit++;
          for (let k = 0; k < 3; k++) sum[k] += sample(u, v, k) * paper[k];
        }
      if (!hit) continue;
      const a = hit / (N * N), i = (y * W + x) * channels;
      for (let k = 0; k < 3; k++) px[i + k] = Math.round((sum[k] / hit) * a + px[i + k] * (1 - a));
    }
}

async function photo({ name, n, crop, widths, upscale, plate }) {
  for (const w of widths) {
    let img = await cropped(src(n), crop);
    const meta = await sharp(await img.toBuffer()).metadata();
    if (w > meta.width && !upscale) continue;
    img = sharp(await img.toBuffer()).resize({ width: w, kernel: "lanczos3" });
    // the exterior shots are small: a gentle sharpen keeps the upscale crisp
    if (w > meta.width) img = img.sharpen({ sigma: 1.1, m1: 0.6, m2: 1.6 });
    if (plate) {
      // drawn at the final size, so the lettering is as sharp as the output allows
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      const k = w / meta.width;
      const quad = plate.map(([x, y]) => [(x - crop[0]) * k, (y - crop[1]) * k]);
      await coverPlate(data, info.width, info.height, info.channels, quad, { grow: 1.2 * k });
      img = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png();
    }
    await emit(img, name, w);
  }
}

/* ------------------------------------------------------------
   Hero cut-out: studio shot on a near-white backdrop.
   Background is flood-filled from the borders; whatever the fill
   reaches is "un-multiplied" into transparent black so the soft
   floor shadow survives on any background colour.
   ------------------------------------------------------------ */
async function cutout() {
  const region = { left: 150, top: 30, width: 1210, height: 520 };
  const { data, info } = await sharp(src(8))
    .extract(region)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const N = W * H;

  // the model badge on the front plate becomes the brand plate
  const badge = [[929.5, 319], [1065, 317.5], [1064.5, 352.5], [929.5, 354.5]].map(([x, y]) => [x - region.left, y - region.top]);
  await coverPlate(data, W, H, 3, badge, { badge: true, grow: 0 });

  const min = new Uint8Array(N);
  const chroma = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const lo = Math.min(r, g, b);
    min[i] = lo;
    chroma[i] = Math.max(r, g, b) - lo;
  }

  const BG = 247; // backdrop level
  const HARD = 226; // always background above this
  const FLOOR = 56; // the smooth grow never enters anything darker
  const TOL = 16; // max step between neighbours for the smooth grow
  const SHADOW_TOP = Math.round(H * 0.62); // soft shadow only lives low in the frame

  const outside = new Uint8Array(N);
  const stack = [];
  const seed = (i) => {
    if (!outside[i] && min[i] >= HARD) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }

  while (stack.length) {
    const i = stack.pop();
    const x = i % W, y = (i / W) | 0;
    const nb = [];
    if (x > 0) nb.push(i - 1);
    if (x < W - 1) nb.push(i + 1);
    if (y > 0) nb.push(i - W);
    if (y < H - 1) nb.push(i + W);
    for (const j of nb) {
      if (outside[j]) continue;
      const bright = min[j] >= HARD;
      const soft =
        ((j / W) | 0) >= SHADOW_TOP &&
        min[j] >= FLOOR &&
        chroma[j] < 12 &&
        Math.abs(min[j] - min[i]) <= TOL;
      if (bright || soft) {
        outside[j] = 1;
        stack.push(j);
      }
    }
  }

  const out = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    if (outside[i]) {
      const a = Math.max(0, Math.min(1, 1 - min[i] / BG));
      out[i * 4 + 3] = Math.round(a * 255 * 0.9);
    } else {
      out[i * 4] = data[i * 3];
      out[i * 4 + 1] = data[i * 3 + 1];
      out[i * 4 + 2] = data[i * 3 + 2];
      out[i * 4 + 3] = 255;
    }
  }

  // soften the 1px boundary: edge pixels of the car that touch the
  // backdrop were anti-aliased against white, pull that white out.
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (outside[i]) continue;
      const touches = outside[i - 1] || outside[i + 1] || outside[i - W] || outside[i + W];
      if (!touches || min[i] < 120) continue;
      const a = Math.max(0.15, 1 - (min[i] - 120) / (BG - 120));
      out[i * 4 + 3] = Math.round(a * 255);
      for (let c = 0; c < 3; c++) {
        const v = (data[i * 3 + c] - BG * (1 - a)) / a;
        out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
  }

  const png = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  for (const w of [720, 1200]) {
    await emit(sharp(png).resize({ width: w, kernel: "lanczos3" }), "hero-ibiza", w, { alpha: true });
  }
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const p of PHOTOS) await photo(p);
await cutout();

for (const e of Object.values(MANIFEST)) delete e.hash;
await writeFile(path.join(ROOT, "src", "lib", "images.json"), JSON.stringify(MANIFEST, null, 2) + "\n");

let total = 0;
for (const f of (await readdir(OUT)).sort()) {
  const { size } = await stat(path.join(OUT, f));
  total += size;
  console.log(f.padEnd(28), (size / 1024).toFixed(1).padStart(7), "KB");
}
console.log("—".repeat(40), `\n${"total".padEnd(28)} ${(total / 1024).toFixed(1).padStart(7)} KB`);
