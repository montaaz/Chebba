"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateClientAction } from "@/app/actions/admin";
import Icon from "@/components/Icon";
import { FIELD, INPUT, LABEL, Notice } from "@/components/ui";
import { dateTime, noEmail } from "@/lib/format";

type Props = { id: number; name: string; email: string; phone: string; lastLogin: Date | null };

/* Contact details on the client sheet, with an inline form to correct them. */
export default function ClientEdit({ id, name, email, phone, lastLogin }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  // "Modifier" in the client list opens the sheet straight on this form
  useEffect(() => {
    if (window.location.hash === "#modifier") setEditing(true);
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (editing)
    return (
      <form
        id="modifier"
        className="flex scroll-mt-24 flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          const r = await updateClientAction(id, { name: f.get("name"), email: f.get("email"), phone: f.get("phone") });
          setBusy(false);
          if (!r.ok) return setError(r.error);
          setEditing(false);
          setSaved(true);
          router.refresh();
        }}
      >
        <label className={FIELD}>
          <span className={LABEL}>Nom complet</span>
          <input className={INPUT} name="name" defaultValue={name} required minLength={2} maxLength={80} autoComplete="off" />
        </label>
        <label className={FIELD}>
          <span className={LABEL}>E-mail (identifiant de connexion)</span>
          <input className={INPUT} name="email" type="email" defaultValue={noEmail(email) ? "" : email} placeholder={noEmail(email) ? "Ajoutez son e-mail" : undefined} required maxLength={160} autoComplete="off" autoCapitalize="none" inputMode="email" />
        </label>
        <label className={FIELD}>
          <span className={LABEL}>Téléphone</span>
          <input className={INPUT} name="phone" type="tel" defaultValue={phone} required maxLength={24} autoComplete="off" inputMode="tel" />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn--ghost min-h-11" onClick={() => setEditing(false)} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="btn btn--solid min-h-11" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
        <p className="text-xs text-fog">Changer l&apos;e-mail change l&apos;identifiant : prévenez le client.</p>
      </form>
    );

  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-mist">E-mail (identifiant)</dt>
          <dd className={`text-right break-all ${noEmail(email) ? "text-fog italic" : "font-semibold"}`}>{noEmail(email) ? "Sans e-mail" : email}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-mist">Téléphone</dt>
          <dd className="font-semibold">{phone}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-mist">Dernière connexion</dt>
          <dd>{lastLogin ? dateTime(lastLogin) : "Jamais"}</dd>
        </div>
      </dl>
      {saved && <Notice tone="ok">Coordonnées enregistrées.</Notice>}
      <button type="button" className="btn btn--ghost min-h-11" onClick={() => (setSaved(false), setEditing(true))}>
        <Icon name="sliders" size={17} /> Modifier les coordonnées
      </button>
    </div>
  );
}
