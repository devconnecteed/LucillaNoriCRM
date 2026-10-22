import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { QUOTE_STATUS_LABELS, euro, quoteEffectiveStatus } from "@/lib/quote";
import { Badge, ButtonLink, Empty, FilterChips, PageHeader, Stat, Table, Td, fmtDate, statusTone } from "@/components/ui";

export const metadata = { title: "Preventivi" };

const FILTERS = [
  { value: "", label: "Tutti" },
  { value: "SENT", label: "In attesa" },
  { value: "ACCEPTED", label: "Accettati" },
  { value: "DRAFT", label: "Bozze" },
  { value: "DECLINED", label: "Rifiutati" },
];

/** Preventivi (tavola 11): offerte collegate ai percorsi, stato evidente, nuova proposta a portata di mano. */
export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ stato?: string }> }) {
  const user = await requireStaff();
  const { stato = "" } = await searchParams;
  const scope = user.role === "ADMIN" ? {} : { teacherId: user.id };
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [quotes, all] = await Promise.all([
    db.quote.findMany({ where: { ...scope, ...(stato ? { status: stato } : {}) }, include: { courseType: true }, orderBy: { createdAt: "desc" } }),
    db.quote.findMany({ where: { ...scope, createdAt: { gte: yearStart } }, select: { status: true, validUntil: true, totalCents: true, editionId: true } }),
  ]);
  const waiting = all.filter((q) => quoteEffectiveStatus(q) === "SENT");
  const accepted = all.filter((q) => q.status === "ACCEPTED");
  const toStart = accepted.filter((q) => !q.editionId).length;
  const proposed = all.filter((q) => ["SENT", "ACCEPTED"].includes(q.status)).reduce((s, q) => s + q.totalCents, 0);

  return (
    <>
      <PageHeader eyebrow="Le proposte della tua scuola" title="Preventivi" subtitle="Offerte su misura, invio digitale e monitoraggio dello stato di accettazione."
        actions={<ButtonLink icon="plus" href="/docente/preventivi/nuovo">Nuovo preventivo</ButtonLink>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="In attesa" value={String(waiting.length).padStart(2, "0")} hint="Inviati alla potenziale allieva" href="/docente/preventivi?stato=SENT" />
        <Stat label="Accettati" value={String(accepted.length).padStart(2, "0")} hint={toStart ? `${toStart} da avviare come percorso` : "Quest’anno"} hintTone={toStart ? "wine" : "ok"} href="/docente/preventivi?stato=ACCEPTED" />
        <Stat label="Valore proposte" value={euro(proposed).replace(",00", "")} hint="Inviati e accettati quest’anno" hintTone="muted" />
      </div>

      <div className="mb-4"><FilterChips active={stato} items={FILTERS.map((f) => ({ ...f, href: f.value ? `?stato=${f.value}` : "?" }))} /></div>

      {quotes.length ? (
        <Table head={["Numero", "Destinataria", "Percorso", "Importo", "Validità", "Stato", ""]}>
          {quotes.map((q) => {
            const st = quoteEffectiveStatus(q);
            return (
              <tr key={q.id}>
                <Td className="font-mono text-xs">{q.number}</Td>
                <Td><b>{q.prospectFirstName} {q.prospectLastName}</b><span className="block text-xs text-muted">{q.prospectEmail}</span></Td>
                <Td>{q.courseType.title}<span className="block text-xs text-muted">{q.lessons} lezioni</span></Td>
                <Td className="whitespace-nowrap font-semibold">{euro(q.totalCents)}</Td>
                <Td>{fmtDate(q.validUntil)}</Td>
                <Td>
                  <Badge tone={statusTone(st)}>{QUOTE_STATUS_LABELS[st]}</Badge>
                  {st === "ACCEPTED" && !q.editionId && <span className="block pt-1 text-[11px] text-wine">da avviare</span>}
                </Td>
                <Td className="text-right"><ButtonLink size="sm" variant="secondary" href={`/docente/preventivi/${q.id}`}>Apri</ButtonLink></Td>
              </tr>
            );
          })}
        </Table>
      ) : <Empty icon="file">Nessun preventivo. <Link className="text-wine underline" href="/docente/preventivi/nuovo">Creane uno</Link> partendo dal listino di un corso.</Empty>}
    </>
  );
}
