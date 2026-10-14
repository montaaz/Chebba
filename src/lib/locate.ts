"use client";

export type Located = { label: string; lat: number; lng: number };

/* The phone's position, named by the server (and refused outside the service area).
   Throws an Error whose message can be shown as is. */
export function locateMe(): Promise<Located> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("La localisation n'est pas disponible sur cet appareil."));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/geo/search?lat=${pos.coords.latitude.toFixed(5)}&lng=${pos.coords.longitude.toFixed(5)}`);
          const data = await res.json();
          if (!res.ok) return reject(new Error(data.error ?? "Position introuvable."));
          const label = String(data.place.label);
          resolve({ ...data.place, label: label.startsWith("Point sur la carte") ? "Ma position" : label });
        } catch {
          reject(new Error("Connexion perdue."));
        }
      },
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Autorisez la localisation dans votre navigateur pour utiliser votre position."
              : "Position introuvable pour le moment.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}
