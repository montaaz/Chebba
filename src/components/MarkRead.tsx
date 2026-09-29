"use client";

import { useEffect } from "react";
import { markReadAction } from "@/app/actions/notifications";

export default function MarkRead({ box, upToId }: { box: string; upToId: number }) {
  useEffect(() => {
    // a short pause: the unread markers stay visible long enough to be noticed
    const t = setTimeout(() => void markReadAction(box, upToId), 1500);
    return () => clearTimeout(t);
  }, [box, upToId]);
  return null;
}
