import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { one, query } from "./db";
import type { User } from "../types";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = "chebba_session";
const SESSION_DAYS = 30;
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MIN = 15;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const actual = await scryptAsync(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  // only the hash is stored: a leaked table cannot be replayed as cookies
  await query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
    userId,
    digest(token),
    expires,
  ]);
  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [userId]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [digest(token)]);
  jar.delete(COOKIE);
}

/* Resolved once per request, however many components ask for it. */
export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const user = await one<User>(
    `SELECT u.id, u.role, u.full_name, u.email, u.phone
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active`,
    [digest(token)],
  );
  return user ?? null;
});

export async function requireUser(next = "/compte") {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/compte");
  return user;
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim().slice(0, 60);
}

/* ---- brute-force throttle, shared by every server instance through the table ---- */
export async function tooManyAttempts(bucket: string) {
  const row = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM login_attempts
      WHERE bucket = $1 AND created_at > now() - make_interval(mins => $2)`,
    [bucket, ATTEMPT_WINDOW_MIN],
  );
  return (row?.n ?? 0) >= MAX_ATTEMPTS;
}

export async function recordAttempt(bucket: string) {
  await query("INSERT INTO login_attempts (bucket) VALUES ($1)", [bucket]);
  // opportunistic clean-up keeps the table small without a cron job
  if (Math.random() < 0.05) {
    await query("DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'");
    await query("DELETE FROM sessions WHERE expires_at < now()");
  }
}

/* Only same-site relative paths are accepted as a post-login destination. */
export const safeNext = (next: unknown, fallback = "/compte") =>
  typeof next === "string" && /^\/(?![/\\])[\w\-./?=&%]*$/.test(next) ? next : fallback;
