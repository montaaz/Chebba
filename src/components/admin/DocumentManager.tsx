"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteDocumentAction, renameDocumentAction, rotateDocumentAction, uploadDocumentAction } from "@/app/actions/documents";
import Icon from "@/components/Icon";
import { Notice } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { docUrl, MAX_DOCUMENTS } from "@/lib/photos";
import { shrink } from "@/lib/shrink";
import type { ReservationDocument } from "@/lib/types";

/* Contract, ID, licence… photographed and attached to one reservation. Admin only. */
export default function DocumentManager({ reservationId, reference, docs }: { reservationId: number; reference: string; docs: ReservationDocument[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [askDelete, setAskDelete] = useState<number | null>(null);
  const [label, setLabel] = useState("Contrat de location");
  const [, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const refresh = () => startTransition(() => router.refresh());
  const room = MAX_DOCUMENTS - docs.length;

  const upload = async (files: File[]) => {
    setError("");
    if (!files.length) return;
    if (files.length > room) {
      setError(`${MAX_DOCUMENTS} documents maximum : ${room} de plus possible${room > 1 ? "s" : ""}.`);
      files = files.slice(0, room);
    }
    let done = 0;
    for (const f of files) {
      setBusy(`Envoi ${done + 1} / ${files.length}…`);
      try {
        const fd = new FormData();
        fd.set("reservationId", String(reservationId));
        fd.set("label", label);
        // documents keep more pixels than vehicle photos so the text stays readable
        fd.set("photo", await shrink(f, 2800), "document.jpg");
        const r = await uploadDocumentAction(fd);
        if (!r.ok) {
          setError(r.error);
          break;
        }
        done++;
      } catch (e) {
        setError((e as Error).message);
        break;
      }
    }
    setBusy("");
    refresh();
  };

  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => {
    setBusy(msg);
    setError("");
    const r = await fn();
    if (!r.ok) setError(r.error ?? "Action impossible.");
    setBusy("");
    refresh();
  };

  const tool = "grid size-10 cursor-pointer place-items-center rounded-full bg-night/85 text-ink backdrop-blur hover:bg-deep disabled:opacity-30";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[0.68rem] font-semibold tracking-[0.18em] text-mist uppercase">Type de document</span>
          <input
            list="doc-labels"
            value={label}
            maxLength={80}
            onChange={(e) => setLabel(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-hair bg-white/5 px-3 text-base outline-none focus:border-aqua"
          />
          <datalist id="doc-labels">
            <option value="Contrat de location" />
            <option value="Pièce d'identité" />
            <option value="Permis de conduire" />
            <option value="État des lieux" />
            <option value="Reçu de paiement" />
          </datalist>
        </label>
        <button type="button" disabled={!!busy || room <= 0} onClick={() => camera.current?.click()} className="btn btn--ghost min-h-11 sm:hidden">
          Photographier
        </button>
        <button type="button" disabled={!!busy || room <= 0} onClick={() => input.current?.click()} className="btn btn--solid min-h-11">
          <Icon name="plus" size={18} /> {busy || "Ajouter des photos"}
        </button>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (upload(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (upload(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {docs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-mist">Aucun document. Ajoutez la photo du contrat signé, de la pièce d&apos;identité ou du permis.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {docs.map((d, i) => (
            <li key={d.id} className="overflow-hidden rounded-xl border border-hair bg-black/30">
              <button
                type="button"
                data-zoom="photo"
                data-zoom-src={docUrl(d, "large")}
                data-zoom-ratio={(d.width / d.height).toFixed(4)}
                data-zoom-group={`docs-${reservationId}`}
                data-zoom-caption={`${reference} — ${d.label || "Document"} (${i + 1}/${docs.length})`}
                className="relative block aspect-[4/3] w-full cursor-zoom-in bg-black/40"
                aria-label={`Ouvrir ${d.label || "le document"} en grand`}
              >
                <img src={docUrl(d, "small")} alt="" className="h-full w-full object-contain" loading="lazy" />
              </button>
              <div className="flex items-center gap-1 p-2">
                <input
                  defaultValue={d.label}
                  maxLength={80}
                  placeholder="Document"
                  onBlur={(e) => e.target.value !== d.label && act(() => renameDocumentAction(d.id, e.target.value), "Enregistrement…")}
                  className="min-h-9 min-w-0 flex-1 rounded-lg bg-transparent px-1.5 text-sm outline-none focus:bg-white/5"
                  aria-label="Nom du document"
                />
                <button type="button" className={tool} disabled={!!busy} onClick={() => act(() => rotateDocumentAction(d.id, 270), "Rotation…")} aria-label="Pivoter à gauche" title="Pivoter à gauche">
                  ↺
                </button>
                <button type="button" className={tool} disabled={!!busy} onClick={() => act(() => rotateDocumentAction(d.id, 90), "Rotation…")} aria-label="Pivoter à droite" title="Pivoter à droite">
                  ↻
                </button>
                <button type="button" className={`${tool} hover:bg-coral/80`} disabled={!!busy} onClick={() => setAskDelete(d.id)} aria-label="Supprimer le document" title="Supprimer">
                  <Icon name="close" size={16} />
                </button>
              </div>
              <p className="px-2.5 pb-2 text-[0.68rem] text-fog">{dateTime(d.created_at)}</p>
              {askDelete === d.id && (
                <div className="flex items-center justify-between gap-2 border-t border-coral/30 bg-coral/10 p-2 text-xs">
                  Supprimer ?
                  <span className="flex gap-1.5">
                    <button type="button" className="min-h-9 cursor-pointer rounded-full border border-line px-3" onClick={() => setAskDelete(null)}>
                      Non
                    </button>
                    <button type="button" className="min-h-9 cursor-pointer rounded-full bg-coral px-3 font-semibold text-[#2a0f05]" onClick={() => (setAskDelete(null), act(() => deleteDocumentAction(d.id), "Suppression…"))}>
                      Oui
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-fog">Visibles uniquement par l&apos;équipe. Touchez une photo pour zoomer et la tourner.</p>
    </div>
  );
}
