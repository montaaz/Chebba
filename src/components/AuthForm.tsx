"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, type AuthState } from "@/app/actions/auth";
import { FIELD, INPUT, LABEL, LINK, Notice, PANEL, TAP } from "@/components/ui";

export default function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? loginAction : signupAction,
    {},
  );
  const v = state.values ?? {};
  const other = mode === "login" ? "/inscription" : "/connexion";

  return (
    <form action={action} className={`${PANEL} mx-auto flex w-full max-w-md flex-col gap-4`}>
      <div>
        <p className="eyebrow">{mode === "login" ? "Espace client" : "Nouveau client"}</p>
        <h1 className="mt-3 text-[clamp(1.5rem,4vw,2rem)]">{mode === "login" ? "Bon retour." : "Créez votre compte."}</h1>
      </div>
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <>
          <label className={FIELD}>
            <span className={LABEL}>Nom complet</span>
            <input className={INPUT} name="name" defaultValue={v.name} maxLength={80} autoComplete="name" required />
          </label>
          <label className={FIELD}>
            <span className={LABEL}>Téléphone</span>
            <input className={INPUT} name="phone" defaultValue={v.phone} maxLength={24} type="tel" inputMode="tel" autoComplete="tel" required />
          </label>
        </>
      )}
      <label className={FIELD}>
        <span className={LABEL}>E-mail</span>
        <input className={INPUT} name="email" defaultValue={v.email} maxLength={160} type="email" inputMode="email" autoCapitalize="off" autoComplete="email" required />
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Mot de passe</span>
        <input
          className={INPUT}
          name="password"
          type="password"
          minLength={8}
          maxLength={200}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </label>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <button className="btn btn--solid min-h-12" type="submit" disabled={pending}>
        {pending ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
      </button>
      <p className="text-center text-sm text-mist">
        {mode === "login" ? "Pas encore de compte ? " : "Déjà client ? "}
        <Link prefetch={false} className={`${LINK} ${TAP}`} href={`${other}?next=${encodeURIComponent(next)}`}>
          {mode === "login" ? "Inscrivez-vous" : "Connectez-vous"}
        </Link>
      </p>
    </form>
  );
}
