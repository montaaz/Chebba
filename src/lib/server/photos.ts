import "server-only";
import sharp from "sharp";
import { PHOTO_SIZES } from "../photos";

export class PhotoError extends Error {}

const MAX_INPUT = 12 * 1024 * 1024;

/* Any phone or camera photo → two compressed WebP sizes, upright, without metadata
   (no GPS position or camera details are published). */
export async function processPhoto(input: Buffer) {
  if (input.length > MAX_INPUT) throw new PhotoError("Photo trop lourde (12 Mo maximum).");
  let meta;
  try {
    meta = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    throw new PhotoError("Ce fichier n'est pas une image lisible (JPEG, PNG ou WebP).");
  }
  if (!meta.format || !["jpeg", "png", "webp", "avif", "heif"].includes(meta.format)) throw new PhotoError("Format non pris en charge : utilisez JPEG, PNG ou WebP.");
  if ((meta.width ?? 0) < 400 || (meta.height ?? 0) < 250) throw new PhotoError("Photo trop petite (minimum 400 × 250 pixels).");

  const base = sharp(input, { failOn: "error" }).rotate(); // apply the phone's orientation, then drop metadata
  const large = await base.clone().resize({ width: PHOTO_SIZES.large, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toBuffer({ resolveWithObject: true });
  const small = await base.clone().resize({ width: PHOTO_SIZES.small, withoutEnlargement: true }).webp({ quality: 70, effort: 5 }).toBuffer();
  return { large: large.data, small, width: large.info.width, height: large.info.height, bytes: large.data.length + small.length };
}

/* A photographed document must stay readable when zoomed: bigger and sharper than vehicle photos.
   `turn` rotates it by a quarter turn (90, 180, 270) to fix a sideways shot. */
export async function processDocument(input: Buffer, turn = 0) {
  if (input.length > MAX_INPUT) throw new PhotoError("Photo trop lourde (12 Mo maximum).");
  let meta;
  try {
    meta = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    throw new PhotoError("Ce fichier n'est pas une image lisible (JPEG, PNG ou WebP).");
  }
  if (!meta.format || !["jpeg", "png", "webp", "avif", "heif"].includes(meta.format)) throw new PhotoError("Format non pris en charge : utilisez JPEG, PNG ou WebP.");
  if ((meta.width ?? 0) < 300 || (meta.height ?? 0) < 300) throw new PhotoError("Photo trop petite pour être lisible.");
  // sharp 0.33 keeps only one rotate() per pipeline: stand the phone photo upright first, then turn it
  let base = sharp(input, { failOn: "error" }).rotate();
  if (turn) {
    const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
    base = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).rotate(turn);
  }
  const large = await base.clone().resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
  const small = await base.clone().resize({ width: 480, height: 480, fit: "inside" }).webp({ quality: 70, effort: 4 }).toBuffer();
  return { large: large.data, small, width: large.info.width, height: large.info.height, bytes: large.data.length + small.length };
}
