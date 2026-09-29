"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/server/auth";
import { boxOf, markRead } from "@/lib/server/notify";
import { toInt } from "@/lib/validate";

/* Called by the list once it is really on screen — never by a link prefetch. */
export async function markReadAction(box: string, upToId: number) {
  const user = await getUser();
  const id = toInt(upToId, 1, 2_147_483_647);
  if (!user || !id) return;
  await markRead(user, boxOf(user, box), id);
  revalidatePath("/", "layout");
}
