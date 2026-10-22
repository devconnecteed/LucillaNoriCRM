import type { Quote, CourseType } from "@prisma/client";
import { euro, type QuoteLine } from "@/lib/quote";
import { Card, Logo, fmtDate } from "./ui";

/** Il preventivo come lo vede l'allieva (usato anche nell'anteprima docente). */
export function QuoteDocument({ quote, teacherName }: { quote: Quote & { courseType: CourseType }; teacherName: string }) {
  const lines = quote.lines as QuoteLine[];
  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Logo small />
        <div className="text-right text-sm">
          <div className="font-serif text-[24px] text-wine-dark">Preventivo</div>
          <div className="font-mono text-xs text-muted">{quote.number}</div>
          <div className="text-muted">del {fmtDate(quote.sentAt ?? quote.createdAt)}</div>
        </div>
      </div>

      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Per</div>
          <div className="font-medium">{quote.prospectFirstName} {quote.prospectLastName}</div>
          <div className="text-muted">{quote.prospectEmail}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Percorso</div>
          <div className="font-medium">{quote.courseType.title}</div>
          <div className="text-muted">{quote.lessons} lezioni da {quote.lessonMinutes} minuti</div>
        </div>
      </div>

      {quote.courseType.objectives && <p className="rounded-xl bg-ln-50 p-4 text-sm text-wine-dark">{quote.courseType.objectives}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-line">
              <th className="py-2 text-left font-medium">Descrizione</th>
              <th className="px-2 py-2 text-right font-medium">Q.tà</th>
              <th className="px-2 py-2 text-right font-medium">Prezzo</th>
              <th className="py-2 text-right font-medium">Importo</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-[#f2edeb]">
                <td className="py-2 pr-2">{l.label}</td>
                <td className="px-2 py-2 text-right">{l.qty.toLocaleString("it-IT")}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{euro(l.unitCents)}</td>
                <td className="py-2 text-right whitespace-nowrap">{euro(Math.round(l.qty * l.unitCents))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Imponibile</dt><dd>{euro(quote.subtotalCents)}</dd></div>
        {quote.discountCents > 0 && <div className="flex justify-between"><dt className="text-muted">Sconto {quote.discountPct.toLocaleString("it-IT")}%</dt><dd>− {euro(quote.discountCents)}</dd></div>}
        {quote.vatCents > 0 && <div className="flex justify-between"><dt className="text-muted">IVA {quote.vatRate.toLocaleString("it-IT")}%</dt><dd>{euro(quote.vatCents)}</dd></div>}
        <div className="flex justify-between border-t border-ln-100 pt-2 font-serif text-2xl text-wine"><dt>Totale</dt><dd>{euro(quote.totalCents)}</dd></div>
      </dl>

      {quote.notes && (
        <div className="text-sm">
          <div className="mb-1 text-xs uppercase tracking-wide text-muted">Note e condizioni</div>
          <p className="whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}
      <p className="text-xs text-muted">Preventivo valido fino al {fmtDate(quote.validUntil)} · {teacherName}, LN Stile e Portamento</p>
    </Card>
  );
}
