/* First-run data: the settings row, the Ibiza FR, quick-pick places and the
   admin account. Safe to run again — it never overwrites existing rows.
   Run:  npm run db:seed */
import "./db-env.mjs";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "Administrateur", ADMIN_PHONE = "" } = process.env;

const hash = (password) => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
};

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query("INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING");

await client.query(
  `INSERT INTO cars (slug, make, model, trim_level, model_year, seats, luggage, transmission, fuel, image)
   VALUES ('seat-ibiza-fr', 'SEAT', 'Ibiza', 'FR', 2026, 5, 2, 'automatic', 'petrol', 'hero-ibiza')
   ON CONFLICT (slug) DO NOTHING`,
);

const PLACES = [
  ["Aéroport Tunis-Carthage", "airport", 36.851, 10.2272],
  ["Aéroport Enfidha-Hammamet", "airport", 36.0758, 10.4386],
  ["Aéroport Monastir", "airport", 35.7581, 10.7547],
  ["Aéroport Djerba-Zarzis", "airport", 33.875, 10.7755],
  ["Tunis centre", "city", 36.8008, 10.18],
  ["Hammamet", "city", 36.4, 10.6167],
  ["Sousse", "city", 35.8256, 10.6369],
  ["Port de La Goulette", "port", 36.8183, 10.305],
];
if ((await client.query("SELECT 1 FROM places LIMIT 1")).rowCount === 0) {
  for (const [i, [name, kind, lat, lng]] of PLACES.entries()) {
    await client.query(
      "INSERT INTO places (name, kind, lat, lng, sort_order) VALUES ($1, $2, $3, $4, $5)",
      [name, kind, lat, lng, i],
    );
  }
  console.log(`${PLACES.length} places added.`);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set — no admin account created.");
} else if (ADMIN_PASSWORD.length < 10) {
  console.log("ADMIN_PASSWORD must be at least 10 characters — no admin account created.");
} else {
  const { rowCount } = await client.query(
    `INSERT INTO users (role, full_name, email, phone, password_hash)
     SELECT 'admin', $1::varchar, $2::varchar, $3::varchar, $4::varchar
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower($2::varchar))`,
    [ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, hash(ADMIN_PASSWORD)],
  );
  console.log(rowCount ? `Admin account created: ${ADMIN_EMAIL}` : `Account ${ADMIN_EMAIL} already exists.`);
}

/* One time only: the Ibiza's built-in showroom photos (number plates already replaced)
   become ordinary vehicle photos the admin can reorder, replace or delete.
   A marker row makes sure deleted photos never come back on a later run. */
const MARK = "seed:ibiza-photos";
const marked = (await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [MARK])).rowCount;
const ibiza = (await client.query("SELECT id FROM cars WHERE slug = 'seat-ibiza-fr'")).rows[0];
const hasTable = (await client.query("SELECT to_regclass('car_photos') AS t")).rows[0].t;
// sharp may not load on every machine (very old CPUs): then skip and try again on the next run
const sharp = !marked && ibiza && hasTable ? await import("sharp").then((m) => m.default).catch((e) => console.warn(`Photo import skipped: ${e.message.split("\n")[0]}`)) : null;
if (sharp) {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { ROOT } = await import("./db-env.mjs");
  const files = ["ext-front34", "ext-front", "ext-rear34", "ext-rear", "ext-grille"].map((n) => path.join(ROOT, "public", "img", `${n}-${n === "ext-grille" ? 900 : 1100}.webp`));
  const existing = (await client.query("SELECT count(*)::int AS n FROM car_photos WHERE car_id = $1", [ibiza.id])).rows[0].n;
  let pos = existing;
  for (const f of files) {
    if (pos >= 10) break;
    const input = await readFile(f).catch(() => null);
    if (!input) continue;
    const large = await sharp(input).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
    const small = await sharp(input).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    await client.query(
      "INSERT INTO car_photos (car_id, position, width, height, small, large, bytes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [ibiza.id, pos++, large.info.width, large.info.height, small, large.data, large.data.length + small.length],
    );
  }
  await client.query("INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [MARK]);
  console.log(`${pos - existing} Ibiza photo(s) imported.`);
}

/* One time only: vehicles added with their photos (already encoded, number plates replaced),
   unless the admin already has that make and model. The marker keeps a deleted one from coming back. */
const FLEET = [
  {
    mark: "seed:mahindra-xuv-3xo", photos: "mahindra-xuv-3xo", slug: "mahindra-xuv-3xo-ax7-l",
    make: "Mahindra", model: "XUV 3XO", trim: "AX7 L", year: 2026, seats: 5, luggage: 3,
    transmission: "automatic", fuel: "petrol", perDay: 100, rental: true, transfer: true, sort: 2,
  },
  {
    mark: "seed:kia-picanto", photos: "kia-picanto", slug: "kia-picanto-2026",
    make: "Kia", model: "Picanto", trim: "", year: 2026, seats: 5, luggage: 2,
    transmission: "manual", fuel: "petrol", perDay: 100, rental: true, transfer: false, sort: 3,
  },
];
for (const car of hasTable ? FLEET : []) {
  if ((await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [car.mark])).rowCount) continue;
  const exists = (await client.query("SELECT 1 FROM cars WHERE lower(make) = lower($1) AND lower(model) = lower($2)", [car.make, car.model])).rowCount;
  await client.query("BEGIN");
  if (!exists) {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const { ROOT } = await import("./db-env.mjs");
    const dir = path.join(ROOT, "db", "seed-photos", car.photos);
    const photos = JSON.parse(await readFile(path.join(dir, "photos.json"), "utf8"));
    const { rows } = await client.query(
      `INSERT INTO cars (slug, make, model, trim_level, model_year, seats, luggage, transmission, fuel, image, units,
          for_rental, for_transfer, price_per_day, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '', 1, $10, $11, $12, true, $13)
       ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [car.slug, car.make, car.model, car.trim, car.year, car.seats, car.luggage, car.transmission, car.fuel, car.rental, car.transfer, car.perDay, car.sort],
    );
    if (rows[0]) {
      for (const [pos, p] of photos.entries()) {
        const large = await readFile(path.join(dir, `${p.file}-large.webp`));
        const small = await readFile(path.join(dir, `${p.file}-small.webp`));
        await client.query(
          "INSERT INTO car_photos (car_id, position, width, height, small, large, bytes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [rows[0].id, pos, p.width, p.height, small, large, large.length + small.length],
        );
      }
      console.log(`${car.make} ${car.model} added with ${photos.length} photos.`);
    }
  }
  await client.query("INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [car.mark]);
  await client.query("COMMIT");
}

console.log("Seed complete.");
await client.end();
