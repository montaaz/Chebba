"use client";

import { useActionState } from "react";
import { adminNoteAction, type FormState } from "@/app/actions/admin";
import { INPUT, Notice } from "@/components/ui";

export default function NoteForm({ id, note }: { id: number; note: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(adminNoteAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <textarea className={`${INPUT} resize-y`} name="admin_note" rows={3} maxLength={500} defaultValue={note} placeholder="Visible uniquement par l'équipe" />
      {state.saved && <Notice tone="ok">Note enregistrée.</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <button className="btn btn--ghost min-h-12 sm:self-start" type="submit" disabled={pending}>
        Enregistrer la note
      </button>
    </form>
  );
}
