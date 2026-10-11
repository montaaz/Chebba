"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

const TEXT = "Chebba Auto Car — location de voiture et transferts au kilomètre en Tunisie. Prix en ligne et réservation en 3 étapes :";

/* Share buttons next to the QR code: the phone's own share menu first, then the usual fallbacks. */
export default function ShareSite({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  // known only in the browser: decided after the first render so server and browser HTML match
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare("share" in navigator), []);

  const share = async () => {
    try {
      // with the QR image when the phone supports sharing files, else the link alone
      const blob = await fetch("/qr.png").then((r) => r.blob());
      const file = new File([blob], "chebba-auto-car-qr.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: "Chebba Auto Car", text: `${TEXT} ${url}`, files: [file] });
      else await navigator.share({ title: "Chebba Auto Car", text: TEXT, url });
    } catch {
      /* the person closed the share sheet */
    }
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pill = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold transition-colors hover:border-aqua hover:bg-aqua/10";
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {canShare && (
        <button type="button" onClick={share} className="btn btn--solid col-span-2 min-h-12">
          <Icon name="external" size={18} /> Partager
        </button>
      )}
      <a className={pill} href={`https://wa.me/?text=${encodeURIComponent(`${TEXT} ${url}`)}`} target="_blank" rel="noopener noreferrer">
        <Icon name="chat" size={18} /> WhatsApp
      </a>
      <button type="button" onClick={copy} className={`${pill} cursor-pointer`}>
        {copied ? "Lien copié ✓" : "Copier le lien"}
      </button>
      <a className={`${pill} col-span-2`} href="/qr.png" download="chebba-auto-car-qr.png">
        Télécharger le QR code
      </a>
    </div>
  );
}
