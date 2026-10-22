import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { QUOTE_STATUS_LABELS, euro, quoteEffectiveStatus } from "@/lib/quote";
import { Badge, ButtonLink, Empty, PageHeader, Table, Td, fmtDate, statusTone } from "@/components/ui";

export const metadata = { title: "Preventivi" };

const FILTERS = [
  ["", "Tutti"],
  ["SENT", "In attesa"],
  ["ACCEPTED", "Accettati"],
  ["DRAFT", "Bozze"],
  ["DECLINED", "Rifiutati"],
] as const;

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ stato?: string }> }) {
  const user = await requireStaff();
  const { stato = "" } = await searchParams;
  const quotes = await db.quote.findMany({
    where: { ...(user.role === "ADMIN" ? {} : { teacherId: user.id }), ...(stato ? { status: stato } : {}) },
    include: { courseType: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Preventivi" subtitle="Calcola il prezzo di un percorso e invialo alla potenziale allieva per l’accettazione online."
        actions={<ButtonLink href="/docente/preventivi/nuovo">+ Nuovo preventivo</ButtonLink>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([v, l]) => (
          <Link key={v} href={v ? `?stato=${v}` : "?"} className={`rounded-full px-3 py-1 text-sm ${stato === v ? "bg-ln-700 text-white" : "bg-white text-ln-800 ring-1 ring-ln-200"}`}>{l}</Link>
        ))}
      </div>
      {quotes.length ? (
        <Table head={["Numero", "Destinataria", "Corso", "Totale", "Validità", "Stato"]}>
          {quotes.map((q) => {
            const st = quoteEffectiveStatus(q);
            return (
              <tr key={q.id} className="hover:bg-ln-50/50">
                <Td><Link className="font-mono text-xs text-ln-800 hover:underline" href={`/docente/preventivi/${q.id}`}>{q.number}</Link></Td>
                <Td><Link className="font-medium hover:text-ln-700" href={`/docente/preventivi/${q.id}`}>{q.prospectFirstName} {q.prospectLastName}</Link><div className="text-xs text-stone-500">{q.prospectEmail}</div></Td>
                <Td>{q.courseType.title} · {q.lessons} lez.</Td>
                <Td className="whitespace-nowrap font-medium">{euro(q.totalCents)}</Td>
                <Td>{fmtDate(q.validUntil)}</Td>
                <Td>
                  <Badge tone={st === "ACCEPTED" ? "green" : st === "SENT" ? "blue" : statusTone(st)}>{QUOTE_STATUS_LABELS[st]}</Badge>
                  {st === "ACCEPTED" && !q.editionId && <div className="mt-1 text-xs text-ln-700">da avviare</div>}
                </Td>
              </tr>
            );
          })}
        </Table>
      ) : <Empty>Nessun preventivo.</Empty>}
    </>
  );
}
