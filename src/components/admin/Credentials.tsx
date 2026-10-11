"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { waLink } from "@/lib/whatsapp";

type Props = { title: string; name: string; email: string; phone: string; password: string; site: string; children?: React.ReactNode };

/* Login details shown once, ready to send to the client. */
export default function Credentials({ title, name, email, phone, password, site, children }: Props) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);
  const message = `Bonjour ${name.split(" ")[0]}, voici vos accès Chebba Auto Car :\n\nSite : ${site}/connexion\nE-mail : ${email}\nMot de passe : ${password}\n\nVous pourrez le changer dans « Mon profil ».`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-aqua/40 bg-aqua/10 p-4" role="status">
      <p className="text-sm font-semibold">{title}</p>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-3 rounded-xl bg-black/25 px-3 py-2">
          <dt className="text-mist">Identifiant</dt>
          <dd className="font-semibold break-all">{email}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-3 py-2">
          <dt className="text-mist">Mot de passe</dt>
          <dd className="font-display text-lg font-extrabold tracking-wider text-sand select-all">{password}</dd>
        </div>
      </dl>
      <div className={`grid gap-2 ${canShare ? "grid-cols-3" : "grid-cols-2"}`}>
        <button
          type="button"
          className="btn btn--ghost min-h-11 px-2"
          onClick={async () => {
            await navigator.clipboard?.writeText(message).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
        <a className="btn btn--solid min-h-11 px-2" href={waLink(phone, message)} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={18} /> WhatsApp
        </a>
        {canShare && (
          <button type="button" className="btn btn--ghost min-h-11 px-2" onClick={() => navigator.share({ text: message }).catch(() => {})}>
            Partager
          </button>
        )}
      </div>
      <p className="text-xs text-fog">Affiché une seule fois : il n&apos;est enregistré nulle part en clair.</p>
      {children}
    </div>
  );
}
