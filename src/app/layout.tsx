import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import manifest from "@/lib/images.json";
import { CAR, SITE } from "@/lib/site";
import "./globals.css";

const display = Unbounded({
  subsets: ["latin"],
  weight: ["500", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-manrope",
  display: "swap",
});

const name = `${SITE.brand} ${SITE.brandSub}`;
const title = `${name} | Location et transfert en ${SITE.country} — ${CAR.make} ${CAR.model} ${CAR.trim} ${CAR.year}`;
const description = `Location de voiture et transferts au kilomètre en ${SITE.country}. Calculez votre prix en ligne et réservez la ${CAR.make} ${CAR.model} ${CAR.trim} ${CAR.year} en trois étapes.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: title, template: `%s | ${name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "fr_FR",
    siteName: name,
    images: [{ url: `/img/ext-front34-1100.webp?v=${manifest["ext-front34"].v}`, width: 1100, height: 654 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // lets the page paint under the notch and home indicator; spacing is handled with safe-area insets
  viewportFit: "cover",
  themeColor: "#021d1f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
