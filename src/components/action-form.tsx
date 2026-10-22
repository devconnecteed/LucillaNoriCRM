"use client";

import { startTransition, useActionState, type ReactNode } from "react";
import type { ActionState } from "@/server/students";
import { cx } from "./ui";

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;

/**
 * Form collegato a una server action con messaggi di esito.
 * Usa onSubmit invece di `action` così React non svuota i campi in caso di errore di validazione.
 */
export function ActionForm({ action, children, className, render }: {
  action: Action;
  children?: ReactNode;
  className?: string;
  /** Variante con accesso allo stato (es. per campi mostrati solo dopo un errore). */
  render?: (state: ActionState, pending: boolean) => ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  return (
    <form
      className={className}
      // `action` garantisce l'invio come server action anche prima dell'idratazione
      // (altrimenti il browser farebbe un GET con i dati nell'URL); dopo, onSubmit evita il reset del form.
      action={dispatch}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.name) fd.set(submitter.name, submitter.value);
        startTransition(() => dispatch(fd));
      }}
    >
      {render ? render(state, pending) : children}
      {!render && <FormMessage state={state} />}
    </form>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <div role={state.error ? "alert" : "status"} className={cx("mt-3 text-sm", state.error ? "text-red-700" : "text-emerald-700")}>
      {state.error ?? state.ok}
      {state.link && (
        <div className="mt-2 break-all rounded-lg bg-stone-50 p-2 text-xs text-stone-700">
          Link (visibile solo in sviluppo): <a className="text-ln-700 underline" href={state.link}>{state.link}</a>
        </div>
      )}
    </div>
  );
}
