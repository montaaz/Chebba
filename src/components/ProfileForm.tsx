"use client";

import { useActionState } from "react";
import { profileAction, type ProfileState } from "@/app/actions/booking";
import { FIELD, INPUT, LABEL, Notice } from "@/components/ui";

export default function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(profileAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={FIELD}>
        <span className={LABEL}>Nom complet</span>
        <input className={INPUT} name="name" defaultValue={name} maxLength={80} autoComplete="name" required />
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Téléphone</span>
        <input className={INPUT} name="phone" defaultValue={phone} maxLength={24} type="tel" inputMode="tel" autoComplete="tel" required />
      </label>
      <label className={FIELD}>
        <span className={LABEL}>E-mail</span>
        <input className={INPUT} value={email} disabled readOnly />
      </label>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.saved && <Notice tone="ok">Profil mis à jour.</Notice>}
      <button className="btn btn--ghost min-h-12 sm:self-start" type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
