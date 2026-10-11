import type { CarPhoto } from "./types";

export const MAX_PHOTOS = 10;
export const PHOTO_SIZES = { small: 720, large: 1600 } as const;

/* versioned URLs: a replaced photo gets a new address, so year-long caching is safe */
export const photoUrl = (p: Pick<CarPhoto, "id" | "version">, size: "small" | "large") => `/photos/${p.id}/${size}-${p.version}.webp`;
export const photoSrcSet = (p: Pick<CarPhoto, "id" | "version">) =>
  `${photoUrl(p, "small")} ${PHOTO_SIZES.small}w, ${photoUrl(p, "large")} ${PHOTO_SIZES.large}w`;

export const groupPhotos = (photos: CarPhoto[]) => {
  const by = new Map<number, CarPhoto[]>();
  for (const p of photos) (by.get(p.car_id) ?? by.set(p.car_id, []).get(p.car_id)!).push(p);
  return by;
};
