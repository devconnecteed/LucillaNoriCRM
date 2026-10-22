import type { ReactNode } from "react";
import { Logo } from "./ui";

/** Impaginazione delle pagine pubbliche di accesso (stile copertina delle tavole LN Studio). */
export function AuthShell({ children, tagline }: { children: ReactNode; tagline?: string }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-wine-dark p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-x-0 top-0 h-2 bg-gold" aria-hidden="true" />
        <Logo light />
        <div>
          <div className="font-serif text-[52px] leading-[1.05]">LN Studio</div>
          <p className="mt-6 max-w-sm font-serif text-xl leading-relaxed text-white/85">
            {tagline ?? "Un ecosistema digitale per curare ogni relazione, dalla prima conoscenza al rilascio dell’attestato."}
          </p>
        </div>
        <div className="text-xs text-white/60">Lucilla Nori · Stile e Portamento</div>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-6 font-serif text-[300px] italic leading-[0.7] text-white/[0.05]">LN</div>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center lg:hidden"><Logo /></div>
          {children}
        </div>
      </section>
    </main>
  );
}
