"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "@/components/ui";

/** Errore imprevisto: messaggio comprensibile, nessun dettaglio tecnico mostrato all'utente. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <Logo />
      <h1 className="mt-10 font-serif text-[34px] leading-tight text-wine-dark">Qualcosa non è andato a buon fine</h1>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
        Riprova tra qualche istante. Se il problema continua, contatta l’assistenza indicando questo codice: <b className="font-mono">{error.digest ?? "—"}</b>
      </p>
      <div className="mt-8 flex gap-2.5">
        <button type="button" onClick={reset} className="rounded-lg bg-wine px-5 py-3 text-[13px] font-semibold text-white">Riprova</button>
        <Link href="/" className="rounded-lg border border-line bg-white px-5 py-3 text-[13px] font-semibold text-[#654653]">Torna alla tua area</Link>
      </div>
    </main>
  );
}
