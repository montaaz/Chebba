"use server";

import { redirect } from "next/navigation";
import {
  clientIp,
  endSession,
  hashPassword,
  recordAttempt,
  safeNext,
  startSession,
  tooManyAttempts,
  verifyPassword,
} from "@/lib/server/auth";
import { isUniqueViolation, one } from "@/lib/server/db";
import { clean, isEmail, isName, isPassword, isPhone } from "@/lib/validate";

export type AuthState = { error?: string; values?: Record<string, string> };

const THROTTLED = "Trop de tentatives. Réessayez dans quelques minutes.";

/* Shared by the sign-in page and the last step of the booking flow. */
export async function signIn(email: string, password: unknown): Promise<string | null> {
  const bucket = `login:${email.toLowerCase()}`;
  const ipBucket = `login-ip:${await clientIp()}`;
  if ((await tooManyAttempts(bucket)) || (await tooManyAttempts(ipBucket))) return THROTTLED;

  const user = await one<{ id: number; password_hash: string; is_active: boolean }>(
    "SELECT id, password_hash, is_active FROM users WHERE lower(email) = lower($1)",
    [email],
  );
  // a dummy hash keeps the response time the same whether or not the account exists
  const hash = user?.password_hash ?? "scrypt$00000000000000000000000000000000$" + "0".repeat(128);
  const ok = typeof password === "string" && password.length <= 200 && (await verifyPassword(password, hash));
  if (!user || !ok || !user.is_active) {
    await recordAttempt(bucket);
    await recordAttempt(ipBucket);
    return "E-mail ou mot de passe incorrect.";
  }
  await startSession(user.id);
  return null;
}

export async function signUp(input: { name: string; email: string; phone: string; password: unknown }) {
  const { name, email, phone, password } = input;
  if (!isName(name)) return "Indiquez votre nom complet.";
  if (!isEmail(email)) return "Indiquez une adresse e-mail valide.";
  if (!isPhone(phone)) return "Indiquez un numéro de téléphone valide.";
  if (!isPassword(password)) return "Le mot de passe doit contenir au moins 8 caractères.";

  const ipBucket = `signup-ip:${await clientIp()}`;
  if (await tooManyAttempts(ipBucket)) return THROTTLED;
  await recordAttempt(ipBucket);

  try {
    const user = await one<{ id: number }>(
      "INSERT INTO users (full_name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, email, phone, await hashPassword(password)],
    );
    await startSession(user!.id);
    return null;
  } catch (err) {
    if (isUniqueViolation(err)) return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
    throw err;
  }
}

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = clean(form.get("email"), 160);
  const error = await signIn(email, form.get("password"));
  if (error) return { error, values: { email } };
  redirect(safeNext(form.get("next")));
}

export async function signupAction(_: AuthState, form: FormData): Promise<AuthState> {
  const values = {
    name: clean(form.get("name"), 80),
    email: clean(form.get("email"), 160),
    phone: clean(form.get("phone"), 24),
  };
  const error = await signUp({ ...values, password: form.get("password") });
  if (error) return { error, values };
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}
