"use client";

import { useState } from "react";
import { resetClientPasswordAction, type PasswordReset } from "@/app/actions/admin";
import Credentials from "@/components/admin/Credentials";
import Icon from "@/components/Icon";
import { Notice } from "@/components/ui";

/* New password for a client, shown once, ready to send. The old one cannot be read by anyone. */
export default function ResetPassword({ userId, site }: { userId: number; site: string }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PasswordReset | null>(null);

  if (res?.ok)
    return (
      <Credentials title="Nouveau mot de passe créé" name={res.name} email={res.email} phone={res.phone} password={res.password} site={site}>
        <p className="-mt-2 text-xs text-fog">Le client a été déconnecté de ses appareils.</p>
      </Credentials>
    );

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
