"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClientAction, type NewClient as Created } from "@/app/actions/admin";
import Credentials from "@/components/admin/Credentials";
import Icon from "@/components/Icon";
import { FIELD, INPUT, LABEL, Notice, PANEL } from "@/components/ui";

/* "Nouveau client": the admin opens an account and sends the login details straight away.
   `children` is the search bar, shown on the same row as the button. */
export default function NewClient({ site, children }: { site: string; children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Extract<Created, { ok: true }> | null>(null);

  const close = () => {
    setOpen(false);
    setDone(null);
    setError("");
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-64">{children}</div>
        <button type="button" className="btn btn--solid min-h-12 shrink-0 max-sm:w-full" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open}>
          <Icon name={open ? "close" : "plus"} size={18} /> {open ? "Fermer" : "Nouveau client"}
        </button>
      </div>

      {open && (
        <section className={PANEL} aria-label="Nouveau client">
          {done ? (
            <div className="flex max-w-xl flex-col gap-3">
              <Credentials title={`Compte créé pour ${done.name}`} name={done.name} email={done.email} phone={done.phone} password={done.password} site={site} />
              <div className="flex flex-wrap gap-2">
                <Link prefetch={false} href={`/admin/clients/${done.id}`} className="btn btn--ghost min-h-11 flex-1">
                  Ouvrir sa fiche
                </Link>
                <button type="button" className="btn btn--ghost min-h-11 flex-1" onClick={() => setDone(null)}>
                  <Icon name="plus" size={18} /> Un autre client
                </button>
              </div>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                const r = await createClientAction({ name: f.get("name"), email: f.get("email"), phone: f.get("phone") });
                setBusy(false);
                if (!r.ok) return setError(r.error);
                setDone(r);
                router.refresh();
              }}
            >
              <div>
                <h2 className="flex items-center gap-2 text-base">
                  <Icon name="plus" size={19} /> Nouveau client
                </h2>
                <p className="mt-1 text-sm text-mist">Un mot de passe est créé automatiquement, à lui envoyer par WhatsApp ou à copier.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                <label className={FIELD}>
                  <span className={LABEL}>Nom complet</span>
                  <input className={INPUT} name="name" required minLength={2} maxLength={80} autoComplete="off" autoCapitalize="words" />
                </label>
                <label className={FIELD}>
                  <span className={LABEL}>E-mail (identifiant)</span>
                  <input className={INPUT} name="email" type="email" required maxLength={160} autoComplete="off" autoCapitalize="none" inputMode="email" />
                </label>
                <label className={FIELD}>
                  <span className={LABEL}>Téléphone</span>
                  <input className={INPUT} name="phone" type="tel" required maxLength={24} autoComplete="off" inputMode="tel" placeholder="+216 …" />
                </label>
              </div>
              {error && <Notice tone="error">{error}</Notice>}
              <button className="btn btn--solid min-h-12 self-start max-sm:w-full" type="submit" disabled={busy}>
                {busy ? "Création…" : "Créer le compte"}
              </button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
