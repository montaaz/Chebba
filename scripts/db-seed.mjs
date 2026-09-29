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

console.log("Seed complete.");
await client.end();
