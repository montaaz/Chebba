import { getUser } from "@/lib/server/auth";
import { one } from "@/lib/server/db";

/* Contract and ID photos: admins only. Kept in the admin's own browser cache, never in shared caches. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const user = await getUser();
  if (!user || user.role !== "admin") return new Response("Not found", { status: 404 });
  const { id, file } = await params;
  const m = /^(small|large)-(\d{1,6})\.webp$/.exec(file);
  const did = Number(id);
  if (!m || !Number.isInteger(did) || did < 1 || did > 2_147_483_647) return new Response("Not found", { status: 404 });
  const col = m[1] === "large" ? "large" : "small";
  const row = await one<{ img: Buffer }>(`SELECT ${col} AS img FROM reservation_documents WHERE id = $1`, [did]);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.img), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
