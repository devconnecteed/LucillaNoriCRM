import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { quoteEffectiveStatus } from "@/lib/quote";
import { QuoteDocument } from "@/components/quote-document";
import { QuoteResponse } from "@/components/quote-response";
import { Card, Logo, fmtDate } from "@/components/ui";

export const metadata = { title: "Il tuo preventivo", robots: { index: false, follow: false } };

/** Pagina pubblica raggiunta dal link nell'email: nessun login, accesso tramite token monouso. */
export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const q = await db.quote.findUnique({ where: { tokenHash: hashToken(token) }, include: { courseType: true, teacher: true } });
  const open = q && q.status === "SENT" && quoteEffectiveStatus(q) !== "EXPIRED";
  if (q && open && !q.viewedAt) await db.quote.update({ where: { id: q.id }, data: { viewedAt: new Date() } });

  return (
    <main className="min-h-dvh bg-gradient-to-b from-ln-100 to-ivory px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {q && open ? (
          <>
            <p className="text-center text-sm text-stone-600">Ciao {q.prospectFirstName}, ecco il preventivo che ti ha preparato {q.teacher.name}.</p>
            <QuoteDocument quote={q} teacherName={q.teacher.name} />
            <QuoteResponse token={token} firstName={q.prospectFirstName} teacherName={q.teacher.name} />
          </>
        ) : q && (q.status === "ACCEPTED" || q.status === "DECLINED") ? (
          <Card className="mx-auto max-w-md p-8 text-center">
            <div className="mb-6"><Logo /></div>
            {q.status === "ACCEPTED" ? (
              <>
                <h1 className="font-serif text-2xl text-ln-900">Grazie {q.prospectFirstName}!</h1>
                <p className="mt-2 text-sm text-stone-700">
                  Hai accettato il preventivo {q.number} il {fmtDate(q.acceptedAt)}. {q.teacher.name} ti contatterà per fissare le lezioni e ti invierà l’accesso alla tua area riservata.
                </p>
              </>
            ) : (
              <p className="text-sm text-stone-700">Hai indicato di non essere interessata a questo preventivo. Se cambi idea scrivi pure a {q.teacher.name}.</p>
            )}
          </Card>
        ) : (
          <Card className="mx-auto max-w-md p-8 text-center">
            <div className="mb-6"><Logo /></div>
            <p className="text-sm text-stone-700">
              {q && quoteEffectiveStatus(q) === "EXPIRED"
                ? "Questo preventivo è scaduto. Scrivi alla tua insegnante per riceverne uno aggiornato."
                : "Questo link non è più attivo: il preventivo potrebbe essere già stato gestito, aggiornato con un nuovo invio o annullato."}
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
