import type { MetadataRoute } from "next";

/* Makes the site installable as an app (Android "Installer", iOS "Sur l'écran d'accueil"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Chebba Auto Car",
    short_name: "Chebba",
    description: "Location de voiture et transferts au kilomètre en Tunisie.",
    lang: "fr",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#021a1c",
    theme_color: "#021a1c",
    categories: ["travel", "navigation"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Réserver un trajet", url: "/reserver?mode=transfert", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mes trajets", url: "/compte", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
