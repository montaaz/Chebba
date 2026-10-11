import { qrPng } from "@/lib/server/qr";

/* the QR code as a picture to download, print or send */
export async function GET() {
  const png = await qrPng();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'inline; filename="chebba-auto-car-qr.png"',
      "Cache-Control": "public, max-age=86400",
    },
  });
}
