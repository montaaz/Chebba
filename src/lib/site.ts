/* ============================================================
   Everything the business may want to change lives here.
   ============================================================ */

export const SITE = {
  brand: "Chebba",
  brandSub: "Auto Car",
  // set NEXT_PUBLIC_SITE_URL once you have your own domain; on Vercel the project's address is used until then
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  country: "Tunisie",
};

export const CAR = {
  make: "SEAT",
  model: "Ibiza",
  trim: "FR",
  year: 2026,
};

export type Angle = { img: string; k: string; title: string; text: string };

/* the four frames of the scroll showroom, in walk-around order */
export const ANGLES: Angle[] = [
  {
    img: "ext-front34",
    k: "Silhouette",
    title: "Un profil qui ne passe pas inaperçu.",
    text: "Lignes tendues, jantes 18\" et teinte gris graphite : l'Ibiza FR a l'allure d'une sportive, le format d'une citadine.",
  },
  {
    img: "ext-front",
    k: "Face avant",
    title: "Un regard Full LED.",
    text: "Signature lumineuse affûtée et calandre hexagonale. De jour comme de nuit, vous voyez loin — et on vous voit.",
  },
  {
    img: "ext-rear34",
    k: "Trois quarts arrière",
    title: "Compacte dehors, généreuse dedans.",
    text: "Cinq portes, cinq vraies places et 355 litres de coffre : les valises du week-end passent sans négocier.",
  },
  {
    img: "ext-rear",
    k: "Poupe",
    title: "La touche FR jusqu'au bout.",
    text: "Diffuseur, double sortie et feux LED : la dernière image que vous laissez sur la route.",
  },
];

export const STATS: { value: number; unit: string; label: string }[] = [
  { value: 5, unit: "", label: "places confortables" },
  { value: 5, unit: "", label: "portes" },
  { value: 355, unit: "L", label: "de coffre" },
  { value: 18, unit: "\"", label: "jantes alliage" },
];

export type Shot = { img: string; k: string; title: string; span: string; sizes: string };

export const INTERIOR: Shot[] = [
  { img: "int-dashboard", k: "Poste de conduite", title: "Tout tombe sous la main", span: "md:col-span-8 md:aspect-[16/9.4]", sizes: "(max-width: 767px) 100vw, 66vw" },
  { img: "int-cockpit", k: "Digital Cockpit", title: "Vos infos, en haute définition", span: "md:col-span-4 md:aspect-auto", sizes: "(max-width: 767px) 100vw, 33vw" },
  { img: "int-screen", k: "Modes de conduite", title: "Eco, Normal, Sport ou Individual", span: "md:col-span-4 md:aspect-[4/3.3]", sizes: "(max-width: 767px) 100vw, 33vw" },
  { img: "int-console", k: "Boîte automatique", title: "DSG et recharge à induction", span: "md:col-span-4 md:aspect-[4/3.3]", sizes: "(max-width: 767px) 100vw, 33vw" },
  { img: "int-climate", k: "Climatisation", title: "Automatique bi-zone", span: "md:col-span-4 md:aspect-[4/3.3]", sizes: "(max-width: 767px) 100vw, 33vw" },
];

export const FEATURES: { icon: string; title: string; text: string }[] = [
  { icon: "gear", title: "Boîte automatique DSG", text: "Souple en ville, réactive sur route. Vous ne pensez plus à l'embrayage." },
  { icon: "screen", title: "Écran tactile connecté", text: "Votre musique, votre navigation et vos appels sur le grand écran central." },
  { icon: "snow", title: "Climatisation bi-zone", text: "Chacun sa température, même en plein mois d'août." },
  { icon: "bolt", title: "Recharge à induction", text: "Posez votre téléphone, il se recharge. Pas de câble à chercher." },
  { icon: "key", title: "Démarrage sans clé", text: "Un bouton, et c'est parti." },
  { icon: "light", title: "Éclairage d'ambiance", text: "Un habitacle qui change d'atmosphère à la nuit tombée." },
];

export const STEPS: { title: string; text: string }[] = [
  { title: "Indiquez votre trajet", text: "Départ, destination, date : le prix s'affiche immédiatement, au kilomètre près." },
  { title: "Recevez la confirmation", text: "Votre demande arrive chez nous aussitôt. Vous suivez son statut depuis votre compte." },
  { title: "Prenez la route", text: "La voiture vous attend, propre, vérifiée et prête à partir." },
];
