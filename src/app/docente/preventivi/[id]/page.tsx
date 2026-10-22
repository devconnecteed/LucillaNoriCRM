import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff, studentScope } from "@/lib/auth";
import { QUOTE_STATUS_LABELS, quoteEffectiveStatus, type QuoteLine } from "@/lib/quote";
import { cancelQuote, convertQuote, saveQuote, sendQuote } from "@/server/quotes";
import { ActionForm } from "@/components/action-form";
import { QuoteBuilder } from "@/components/quote-builder";
import { QuoteDocument } from "@/components/quote-document";
import { Badge, Button, ButtonLink, Card, PageHeader, fmtDateTime, statusTone } from "@/components/ui";

export const metadata = { title: "Preventivo" };

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ modifica?: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const { modifica } = await searchParams;
  const q = await db.quote.findFirst({
    where: { id, ...(user.role === "ADMIN" ? {} : { teacherId: user.id }) },
    include: { courseType: true, teacher: true },
  });
  if (!q) notFound();
  const st = quoteEffectiveStatus(q);

  if (modifica && q.status === "DRAFT") {
    const [courses, students] = await Promise.all([
      db.courseType.findMany({ where: { status: "ACTIVE" }, orderBy: { title: "asc" } }),
      db.student.findMany({ where: { ...studentScope(user), status: "ACTIVE" }, orderBy: { lastName: "asc" } }),
    ]);
    return (
      <>
        <PageHeader eyebrow="Le proposte della tua scuola" title={`Modifica ${q.number}`} actions={<ButtonLink variant="secondary" href={`/docente/preventivi/${id}`}>Annulla</ButtonLink>} />
        <QuoteBuilder action={saveQuote.bind(null, id)} courses={courses}
          students={students.map(({ id, firstName, lastName, email, phone }) => ({ id, firstName, lastName, email, phone }))}
          initial={{
            courseTypeId: q.courseTypeId, studentId: q.studentId,
            prospectFirstName: q.prospectFirstName, prospectLastName: q.prospectLastName, prospectEmail: q.prospectEmail, prospectPhone: q.prospectPhone ?? "",
            lessons: q.lessons, lessonMinutes: q.lessonMinutes, lines: q.lines as QuoteLine[], discountPct: q.discountPct, vatRate: q.vatRate,
            validUntil: q.validUntil.toISOString().slice(0, 10), notes: q.notes ?? "",
          }} />
      </>
    );
  }

  const timeline: [string, Date | null][] = [
    ["Creato", q.createdAt],
    ["Inviato", q.sentAt],
    ["Aperto dall’allieva", q.viewedAt],
    ["Accettato", q.acceptedAt],
    ["Rifiutato", q.declinedAt],
  ];

  return (
    <>
      <PageHeader
        eyebrow="Le proposte della tua scuola"
        title={`Preventivo ${q.number}`}
        subtitle={<span className="flex items-center gap-2">{q.prospectFirstName} {q.prospectLastName} <Badge tone={st === "ACCEPTED" ? "green" : st === "SENT" ? "blue" : statusTone(st)}>{QUOTE_STATUS_LABELS[st]}</Badge></span>}
        actions={<ButtonLink variant="secondary" href="/docente/preventivi">← Preventivi</ButtonLink>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <QuoteDocument quote={q} teacherName={q.teacher.name} />

        <aside className="space-y-6">
          <Card className="space-y-3">
            <h2 className="font-serif text-[22px] text-wine-dark">Azioni</h2>
            {q.status === "DRAFT" && <p className="text-sm text-muted">Controlla il preventivo: all’invio l’allieva riceve un’email con il link per accettarlo.</p>}
            {st === "SENT" && <p className="text-sm text-muted">In attesa di risposta da {q.prospectEmail}. Reinviando, il link precedente smette di funzionare.</p>}
            {st === "EXPIRED" && <p className="text-sm text-muted">La validità è scaduta: il link non è più accettabile.</p>}
            {/* Un solo form in posizione fissa: l'esito dell'invio resta visibile anche dopo il passaggio Bozza → Inviato */}
            {(q.status === "DRAFT" || st === "SENT") && (
              <ActionForm action={sendQuote.bind(null, id)}>
                <Button variant={q.status === "DRAFT" ? "primary" : "secondary"} className="w-full">
                  {q.status === "DRAFT" ? `Invia per email a ${q.prospectEmail}` : "Reinvia email"}
                </Button>
              </ActionForm>
            )}
            {q.status === "DRAFT" && <ButtonLink variant="secondary" className="w-full" href={`/docente/preventivi/${id}?modifica=1`}>Modifica</ButtonLink>}
            {q.status === "ACCEPTED" && (
              q.editionId
                ? <ButtonLink className="w-full" href={`/docente/corsi/${q.editionId}`}>Vai al percorso</ButtonLink>
                : (
                  <>
                    <p className="text-sm text-muted">Crea l’edizione individuale con {q.lessons} lezioni e iscrivi l’allieva. Poi potrai fissare le date e inviarle l’accesso.</p>
                    <form action={convertQuote.bind(null, id)}><Button className="w-full">Avvia il percorso</Button></form>
                  </>
                )
            )}
            {q.studentId && <Link className="block text-sm text-wine underline" href={`/docente/allieve/${q.studentId}`}>Apri anagrafica allieva</Link>}
            {["DRAFT", "SENT"].includes(q.status) && (
              <form action={cancelQuote.bind(null, id)}><Button variant="ghost" className="w-full">Annulla preventivo</Button></form>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-serif text-[22px] text-wine-dark">Cronologia</h2>
            <ul className="space-y-1 text-sm">
              {timeline.filter(([, d]) => d).map(([l, d]) => <li key={l} className="flex justify-between gap-2"><span>{l}</span><span className="text-muted">{fmtDateTime(d)}</span></li>)}
            </ul>
            {q.acceptedName && <p className="mt-3 text-xs text-muted">Accettato da “{q.acceptedName}”{q.acceptedIp && ` · IP ${q.acceptedIp}`}</p>}
            {q.declineReason && <p className="mt-3 rounded-lg bg-[#faf8f7] p-2 text-sm">Motivo del rifiuto: {q.declineReason}</p>}
          </Card>
        </aside>
      </div>
    </>
  );
}
