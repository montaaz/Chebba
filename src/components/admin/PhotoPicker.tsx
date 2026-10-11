"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { MAX_PHOTOS } from "@/lib/photos";

export type Pick = { id: number; file: File; url: string };

let seq = 0;

/* Photos chosen while adding a vehicle: kept in the browser, uploaded once the vehicle exists. */
export default function PhotoPicker({ picks, onChange, disabled }: { picks: Pick[]; onChange: (p: Pick[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [note, setNote] = useState("");
  const room = MAX_PHOTOS - picks.length;

  // free the previews when the component goes away
  const live = useRef(picks);
  live.current = picks;
  useEffect(() => () => live.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const add = (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    setNote(imgs.length > room ? `${MAX_PHOTOS} photos maximum : ${imgs.length - room} non ajoutée${imgs.length - room > 1 ? "s" : ""}.` : imgs.length < files.length ? "Seules les images sont acceptées." : "");
    const next = imgs.slice(0, room).map((file) => ({ id: ++seq, file, url: URL.createObjectURL(file) }));
    if (next.length) onChange([...picks, ...next]);
  };
  const move = (from: number, to: number) => {
    const next = [...picks];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  const remove = (p: Pick) => {
    URL.revokeObjectURL(p.url);
    onChange(picks.filter((x) => x !== p));
  };

  const tool = "grid size-10 cursor-pointer place-items-center rounded-full bg-night/85 text-ink backdrop-blur hover:bg-deep disabled:cursor-default disabled:opacity-30";

  return (
    <div
      onDragOver={(e) => {
        if (!disabled && room > 0 && e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!disabled) add(Array.from(e.dataTransfer.files));
      }}
      className={`rounded-2xl border p-4 transition-colors ${drag ? "border-aqua bg-aqua/10" : "border-hair bg-white/[0.02]"}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            Photos <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums">{picks.length} / {MAX_PHOTOS}</span>
          </p>
          <p className="mt-0.5 text-xs text-fog">La 1ʳᵉ est la couverture. Elles apparaissent dans la vitrine du site, dans cet ordre.</p>
        </div>
        {picks.length > 0 && (
          <button type="button" disabled={disabled || room <= 0} onClick={() => input.current?.click()} className="btn btn--ghost min-h-11">
            <Icon name="plus" size={18} /> Ajouter
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          hidden
          onChange={(e) => {
            add(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {note && <p className="mb-2 text-xs text-[#f3d6a4]">{note}</p>}

      {picks.length === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="grid w-full cursor-pointer place-items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-mist hover:bg-white/[0.04]"
        >
          <Icon name="plus" size={26} />
          Choisir jusqu&apos;à {MAX_PHOTOS} photos
          <span className="text-xs text-fog">Touchez ici, ou glissez-déposez les fichiers sur ordinateur</span>
        </button>
      ) : (
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
          {picks.map((p, i) => (
            <li key={p.id} className="relative overflow-hidden rounded-xl border border-hair bg-black/30">
              <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-video w-full object-cover min-[480px]:aspect-[4/3]" />
              <span className="absolute top-2 left-2 rounded-full bg-night/85 px-2 py-0.5 text-[0.7rem] font-bold tabular-nums">{i === 0 ? "★ Couverture" : i + 1}</span>
              <button type="button" className={`${tool} absolute top-1.5 right-1.5 hover:bg-coral/80`} disabled={disabled} onClick={() => remove(p)} aria-label="Retirer la photo" title="Retirer">
                <Icon name="close" size={16} />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-linear-to-t from-black/80 to-transparent p-2 pt-6">
                <button type="button" className={tool} disabled={disabled || i === 0} onClick={() => move(i, i - 1)} aria-label="Avancer d'une place" title="Avancer">
                  <Icon name="back" size={16} />
                </button>
                <button type="button" className={tool} disabled={disabled || i === picks.length - 1} onClick={() => move(i, i + 1)} aria-label="Reculer d'une place" title="Reculer">
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
