"use client";

import PasswordInput from "@/components/PasswordInput";
import { useActionState, useEffect, useRef } from "react";
import { passwordAction, type ProfileState } from "@/app/actions/booking";
import { FIELD, INPUT, LABEL, Notice } from "@/components/ui";

export default function PasswordForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(passwordAction, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.saved) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-4">
      <label className={FIELD}>
        <span className={LABEL}>Mot de passe actuel</span>
        <PasswordInput className={INPUT} name="current" autoComplete="current-password" maxLength={200} required />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={FIELD}>
          <span className={LABEL}>Nouveau mot de passe</span>
          <PasswordInput className={INPUT} name="next" autoComplete="new-password" minLength={8} maxLength={200} required />
        </label>
        <label className={FIELD}>
          <span className={LABEL}>Confirmer</span>
          <PasswordInput className={INPUT} name="again" autoComplete="new-password" minLength={8} maxLength={200} required />
        </label>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.saved && <Notice tone="ok">Mot de passe modifié. Vos autres appareils ont été déconnectés.</Notice>}
      <button className="btn btn--ghost min-h-12 sm:self-start" type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Changer le mot de passe"}
      </button>
    </form>
  );
}
