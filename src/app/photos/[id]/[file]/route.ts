import { one } from "@/lib/server/db";

/* /photos/12/large-3.webp — serves one stored size. The version in the name makes
   the URL change whenever the photo is replaced, so browsers may cache it for a year. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  const m = /^(small|large)-(\d{1,6})\.webp$/.exec(file);
  const pid = Number(id);
  if (!m || !Number.isInteger(pid) || pid < 1 || pid > 2_147_483_647) return new Response("Not found", { status: 404 });
  const col = m[1] === "large" ? "large" : "small";
  const row = await one<{ img: Buffer; version: number }>(`SELECT ${col} AS img, version FROM car_photos WHERE id = $1`, [pid]);
  if (!row) return new Response("Not found", { status: 404 });
  if (String(row.version) !== m[2]) {
    // an old version was asked for: send the current one, but do not let it be cached under the old name
    return new Response(new Uint8Array(row.img), { headers: { "Content-Type": "image/webp", "Cache-Control": "no-cache" } });
  }
  return new Response(new Uint8Array(row.img), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
