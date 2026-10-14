"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deletePhotoAction, reorderPhotosAction, replacePhotoAction, uploadPhotoAction } from "@/app/actions/photos";
import Icon from "@/components/Icon";
import { Notice } from "@/components/ui";
import { MAX_PHOTOS, photoUrl } from "@/lib/photos";
import type { CarPhoto } from "@/lib/types";
import { shrink } from "@/lib/shrink";

export default function PhotoManager({ carId, carName, photos }: { carId: number; carName: string; photos: CarPhoto[] }) {
  const router = useRouter();
  const [order, setOrder] = useState(photos.map((p) => p.id));
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [askDelete, setAskDelete] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [, startTransition] = useTransition();
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replacing = useRef<number | null>(null);

  // keep local order in step with the server after each refresh
  const ids = photos.map((p) => p.id).join(",");
  const [seen, setSeen] = useState(ids);
  if (ids !== seen) {
    setSeen(ids);
    setOrder(photos.map((p) => p.id));
  }
  const byId = new Map(photos.map((p) => [p.id, p]));
  const list = order.map((id) => byId.get(id)).filter((p): p is CarPhoto => !!p);
  const room = MAX_PHOTOS - list.length;

  const refresh = () => startTransition(() => router.refresh());

  const upload = async (files: File[]) => {
    setError("");
    if (!files.length) return;
    if (files.length > room) {
      setError(room ? `Encore ${room} photo${room > 1 ? "s" : ""} possible${room > 1 ? "s" : ""} pour ce véhicule (${MAX_PHOTOS} maximum).` : `${MAX_PHOTOS} photos maximum par véhicule.`);
      files = files.slice(0, room);
      if (!files.length) return;
    }
    setBusy(true);
    let done = 0;
    for (const f of files) {
      setStatus(`Envoi ${done + 1} / ${files.length}…`);
      try {
        const fd = new FormData();
        fd.set("carId", String(carId));
        fd.set("photo", await shrink(f), "photo.jpg");
        const r = await uploadPhotoAction(fd);
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
    setBusy(false);
    setStatus(done ? `${done} photo${done > 1 ? "s" : ""} ajoutée${done > 1 ? "s" : ""}.` : "");
    refresh();
  };

  const replace = async (file: File) => {
    const id = replacing.current;
    if (!id) return;
    setBusy(true);
    setError("");
    setStatus("Remplacement…");
    try {
      const fd = new FormData();
      fd.set("id", String(id));
      fd.set("photo", await shrink(file), "photo.jpg");
      const r = await replacePhotoAction(fd);
      if (!r.ok) setError(r.error);
      setStatus(r.ok ? "Photo remplacée." : "");
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    }
    setBusy(false);
    refresh();
  };

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setOrder(next);
    setError("");
    const r = await reorderPhotosAction(carId, next);
    if (!r.ok) setError(r.error);
    refresh();
  };

  const remove = async (id: number) => {
    setAskDelete(null);
    setOrder((o) => o.filter((x) => x !== id));
    const r = await deletePhotoAction(id);
    if (!r.ok) setError(r.error);
    setStatus(r.ok ? "Photo supprimée." : "");
    refresh();
  };

  const tool =
    "grid size-10 cursor-pointer place-items-center rounded-full bg-night/85 text-ink backdrop-blur transition-colors hover:bg-deep disabled:cursor-default disabled:opacity-30";

  return (
    <section
      aria-label={`Photos de ${carName}`}
      onDragOver={(e) => {
        if (room > 0 && e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!busy) upload(Array.from(e.dataTransfer.files));
      }}
      className={`rounded-2xl border p-4 transition-colors ${drag ? "border-aqua bg-aqua/10" : "border-hair bg-white/[0.02]"}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base">
            Photos <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums">{list.length} / {MAX_PHOTOS}</span>
          </h3>
          <p className="mt-0.5 text-xs text-fog">La 1ʳᵉ photo est la couverture. L&apos;ordre est celui du site.</p>
        </div>
        <button type="button" disabled={busy || room <= 0} onClick={() => addInput.current?.click()} className="btn btn--solid min-h-11">
          <Icon name="plus" size={18} /> {busy ? status : "Ajouter des photos"}
        </button>
        <input
          ref={addInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          hidden
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <input
          ref={replaceInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) replace(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!error && status && !busy && <p className="mb-2 text-sm text-aqua" role="status">{status}</p>}

      {list.length === 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => addInput.current?.click()}
          className="mt-2 grid w-full cursor-pointer place-items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-mist hover:bg-white/[0.04]"
        >
          <Icon name="plus" size={26} />
          Ajoutez jusqu&apos;à {MAX_PHOTOS} photos
          <span className="text-xs text-fog">Touchez ici, ou glissez-déposez les fichiers sur ordinateur</span>
        </button>
      ) : (
        <ol className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
          {list.map((p, i) => (
            <li key={p.id} className="group/photo relative overflow-hidden rounded-xl border border-hair bg-black/30">
              <img src={photoUrl(p, "small")} alt={`${carName}, photo ${i + 1}`} width={p.width} height={p.height} loading="lazy" className="aspect-video w-full object-cover min-[480px]:aspect-[4/3]" />
              <span className="absolute top-2 left-2 rounded-full bg-night/85 px-2 py-0.5 text-[0.7rem] font-bold tabular-nums">
                {i === 0 ? "★ Couverture" : i + 1}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-linear-to-t from-black/80 to-transparent p-2 pt-6">
                <div className="flex gap-1">
                  <button type="button" className={tool} disabled={busy || i === 0} onClick={() => move(i, i - 1)} aria-label="Avancer d'une place" title="Avancer">
                    <Icon name="back" size={16} />
                  </button>
                  <button type="button" className={tool} disabled={busy || i === list.length - 1} onClick={() => move(i, i + 1)} aria-label="Reculer d'une place" title="Reculer">
                    <Icon name="arrow" size={16} />
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={tool}
                    disabled={busy}
                    onClick={() => {
                      replacing.current = p.id;
                      replaceInput.current?.click();
                    }}
                    aria-label="Remplacer la photo"
                    title="Remplacer"
                  >
                    <Icon name="external" size={15} />
                  </button>
                  <button type="button" className={`${tool} hover:bg-coral/80`} disabled={busy} onClick={() => setAskDelete(p.id)} aria-label="Supprimer la photo" title="Supprimer">
                    <Icon name="close" size={16} />
                  </button>
                </div>
              </div>
              {i !== 0 && (
                <button type="button" disabled={busy} onClick={() => move(i, 0)} className="absolute top-2 right-2 hidden min-h-8 cursor-pointer rounded-full bg-night/85 px-2.5 text-[0.7rem] font-semibold group-hover/photo:block focus:block max-[479px]:block">
                  Mettre en 1ʳᵉ
                </button>
              )}
              {askDelete === p.id && (
                <div className="absolute inset-0 grid place-items-center bg-black/75 p-3 text-center">
                  <div>
                    <p className="text-sm font-semibold">Supprimer cette photo ?</p>
                    <div className="mt-3 flex justify-center gap-2">
                      <button type="button" className="min-h-10 cursor-pointer rounded-full border border-line px-4 text-sm" onClick={() => setAskDelete(null)}>
                        Garder
                      </button>
                      <button type="button" className="min-h-10 cursor-pointer rounded-full bg-coral px-4 text-sm font-semibold text-[#2a0f05]" onClick={() => remove(p.id)}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
