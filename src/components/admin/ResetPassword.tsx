"use client";

import { useState } from "react";
import { resetClientPasswordAction, type PasswordReset } from "@/app/actions/admin";
import Icon from "@/components/Icon";
import { Notice } from "@/components/ui";
import { waLink } from "@/lib/whatsapp";

/* New password for a client, shown once, ready to send. The old one cannot be read by anyone. */
export default function ResetPassword({ userId, site }: { userId: number; site: string }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PasswordReset | null>(null);
  const [copied, setCopied] = useState(false);

  if (res?.ok) {
    const message = `Bonjour ${res.name.split(" ")[0]}, voici vos accès Chebba Auto Car :\n\nSite : ${site}/connexion\nE-mail : ${res.email}\nMot de passe : ${res.password}\n\nVous pourrez le changer dans « Mon profil ».`;
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-aqua/40 bg-aqua/10 p-4">
        <p className="text-sm font-semibold">Nouveau mot de passe créé</p>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3 rounded-xl bg-black/25 px-3 py-2">
            <dt className="text-mist">Identifiant</dt>
            <dd className="font-semibold break-all">{res.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-3 py-2">
            <dt className="text-mist">Mot de passe</dt>
            <dd className="font-display text-lg font-extrabold tracking-wider text-sand select-all">{res.password}</dd>
          </div>
        </dl>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn btn--ghost min-h-11"
            onClick={async () => {
              await navigator.clipboard?.writeText(message).catch(() => {});
              setCopied(true);
            }}
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
          <a className="btn btn--solid min-h-11" href={waLink(res.phone, message)} target="_blank" rel="noopener noreferrer">
            <Icon name="chat" size={18} /> WhatsApp
          </a>
        </div>
        <p className="text-xs text-fog">Affiché une seule fois : il n&apos;est enregistré nulle part en clair. Le client a été déconnecté de ses appareils.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!ask ? (
        <button type="button" className="btn btn--ghost min-h-11" onClick={() => setAsk(true)}>
          <Icon name="lock" size={18} /> Nouveau mot de passe
        </button>
      ) : (
        <div className="rounded-2xl border border-line bg-white/[0.03] p-3 text-sm">
          <p>Créer un nouveau mot de passe ? L&apos;ancien ne fonctionnera plus.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn--ghost min-h-10 flex-1" onClick={() => setAsk(false)}>
              Annuler
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn--solid min-h-10 flex-1"
              onClick={async () => {
                setBusy(true);
                setRes(await resetClientPasswordAction(userId));
                setBusy(false);
                setAsk(false);
              }}
            >
              {busy ? "…" : "Créer"}
            </button>
          </div>
        </div>
      )}
      {res && !res.ok && <Notice tone="error">{res.error}</Notice>}
      <p className="text-xs text-fog">Les mots de passe sont chiffrés : personne ne peut lire l&apos;ancien, même l&apos;administrateur.</p>
    </div>
  );
}
