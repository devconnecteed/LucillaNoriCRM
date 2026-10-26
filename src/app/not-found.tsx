import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata = { title: "Pagina non trovata" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <Logo />
      <h1 className="mt-10 font-serif text-[34px] leading-tight text-wine-dark">Pagina non trovata</h1>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
        La pagina che cerchi non esiste oppure non hai i permessi per vederla.
      </p>
      <Link href="/" className="mt-8 rounded-lg bg-wine px-5 py-3 text-[13px] font-semibold text-white">Torna alla tua area</Link>
    </main>
  );
}
