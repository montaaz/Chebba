"use client";

const MAX_SIDE = 2400;
const MAX_BYTES = 1.8 * 1024 * 1024; // the server's Nginx accepts 2 MB per request

/* Shrink a phone photo in the browser before sending: fast on mobile data, and always
   under the server's upload limit. The server re-compresses it to its final sizes. */
export async function shrink(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error(`« ${file.name} » n'est pas une image.`);
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // a format the browser cannot decode (e.g. some HEIC): let the server try it as is
    if (file.size <= MAX_BYTES) return file;
    throw new Error(`« ${file.name} » : format non lu par ce navigateur. Exportez-la en JPEG.`);
  }
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  for (const q of [0.86, 0.78, 0.68, 0.58]) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", q));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error(`« ${file.name} » reste trop lourde, même compressée.`);
}

