"use client";

import { startTransition, useActionState, useState } from "react";
import { acceptQuote, declineQuote } from "@/server/quotes";
import { Button, Card } from "./ui";

/** Accettazione / rifiuto del preventivo dalla pagina pubblica. */
export function QuoteResponse({ token, firstName, teacherName }: { token: string; firstName: string; teacherName: string }) {
  const [acc, accept, accepting] = useActionState(acceptQuote.bind(null, token), undefined);
  const [dec, decline, declining] = useActionState(declineQuote.bind(null, token), undefined);
  const [showDecline, setShowDecline] = useState(false);

  if (acc?.ok)
    return (
      <Card className="border-emerald-200 bg-emerald-50 text-center">
        <h2 className="font-serif text-2xl text-emerald-900">Grazie {firstName}!</h2>
        <p className="mt-2 text-sm text-emerald-900">Hai accettato il preventivo. {teacherName} ti contatterà a breve per fissare le lezioni; riceverai anche una email di conferma.</p>
      </Card>
    );
  if (dec?.ok)
    return (
      <Card className="text-center">
        <h2 className="font-serif text-xl text-ln-900">Risposta registrata</h2>
        <p className="mt-2 text-sm text-stone-600">Grazie per averci fatto sapere. Se cambi idea scrivi pure a {teacherName}.</p>
      </Card>
    );

  const submit = (fn: (fd: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => fn(fd));
  };

  return (
    <Card className="space-y-4 border-ln-200">
      <h2 className="font-serif text-xl text-ln-900">La tua risposta</h2>
      <form action={accept} onSubmit={submit(accept)} className="space-y-3">
        <label className="block">
          <span className="label">Nome e cognome (vale come conferma)</span>
          <input className="input" name="name" autoComplete="name" required minLength={3} />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="accept" className="mt-1" required />
          <span>Accetto il preventivo e le condizioni indicate.</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="privacy" className="mt-1" required />
          <span>Ho letto l’informativa privacy e acconsento al trattamento dei miei dati per l’organizzazione del corso.</span>
        </label>
        {acc?.error && <p role="alert" className="text-sm text-red-700">{acc.error}</p>}
        <Button className="w-full" disabled={accepting}>{accepting ? "Invio…" : "Accetto il preventivo"}</Button>
      </form>

      <div className="border-t border-stone-100 pt-3">
        {!showDecline ? (
          <button type="button" className="text-sm text-stone-500 underline" onClick={() => setShowDecline(true)}>Non sono interessata</button>
        ) : (
          <form action={decline} onSubmit={submit(decline)} className="space-y-2">
            <label className="block">
              <span className="label">Vuoi dirci il motivo? (facoltativo)</span>
              <textarea className="input" name="reason" maxLength={1000} />
            </label>
            {dec?.error && <p role="alert" className="text-sm text-red-700">{dec.error}</p>}
            <Button variant="secondary" disabled={declining}>Rifiuta il preventivo</Button>
          </form>
        )}
      </div>
    </Card>
  );
}
