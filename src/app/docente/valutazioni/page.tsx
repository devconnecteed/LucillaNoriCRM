import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, studentScope } from "@/lib/auth";
import { enrollmentWhereForStaff } from "@/lib/guards";
import { loadProgress } from "@/lib/progress";
import { relativeDay, shortName } from "@/lib/dates";
import { parseContent } from "@/lib/questionnaire/schema";
import { allItems } from "@/lib/questionnaire/logic";
import { fmtScore } from "@/lib/format";
import { ButtonLink, Card, Empty, FilterChips, Initials, PageHeader, PanelTitle, Stat, Badge } from "@/components/ui";

export const metadata = { title: "Valutazioni" };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt1 = (n: number | null) => (n == null ? "—" : n.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ vista?: string; allieva?: string }> }) {
  const user = await requireStaff();
  const { vista = "da-rivedere", allieva } = await searchParams;
  const scope = enrollmentWhereForStaff(user);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [toReviewCount, completedMonth, waiting, responses, students] = await Promise.all([
    db.response.count({ where: { status: "SUBMITTED", published: false, assignment: { enrollment: scope } } }),
    db.response.count({ where: { status: "SUBMITTED", submittedAt: { gte: monthStart }, assignment: { enrollment: scope } } }),
    db.assignment.count({ where: { enrollment: scope, status: { in: ["SENT", "OPENED", "IN_PROGRESS"] }, version: { template: { audience: "STUDENT" } } } }),
    db.response.findMany({
      where: { status: "SUBMITTED", published: vista === "pubblicati", assignment: { enrollment: scope } },
      include: { assignment: { include: { version: { include: { template: true } }, enrollment: { include: { student: true } } } } },
      orderBy: { submittedAt: "desc" },
      take: 50,
    }),
    db.student.findMany({
      where: { ...studentScope(user), enrollments: { some: { assignments: { some: { responses: { some: { status: "SUBMITTED" } } } } } } },
      orderBy: { lastName: "asc" },
    }),
  ]);

  // Evoluzione: allieva scelta, altrimenti la prima con dati confrontabili
  let selected = students.find((s) => s.id === allieva);
  let progress = selected ? await loadProgress(selected.id) : null;
  if (!selected) {
    // al massimo 20 tentativi: evita di caricare lo storico di tutte le allieve
    for (const s of students.slice(0, 20)) {
      const p = await loadProgress(s.id);
      if (p.rows.length) { selected = s; progress = p; break; }
    }
  }
  const self = progress?.rows.filter((r) => r.source === "self") ?? [];
  const rows = self.length ? self : progress?.rows ?? [];
  const firstVals = rows.map((r) => r.values.find((v) => v != null)).filter((v): v is number => v != null);
  const lastVals = rows.map((r) => [...r.values].reverse().find((v) => v != null)).filter((v): v is number => v != null);
  const initial = avg(firstVals);
  const latest = avg(lastVals);

  const describe = (r: (typeof responses)[number]) => {
    const t = r.assignment.version.template;
    if (r.maxScore) return `Punteggio ${fmtScore(r.manualScore ?? r.autoScore, r.maxScore)}`;
    const items = allItems(parseContent(r.assignment.version.content)).filter((i) => i.type !== "info");
    if (t.audience === "TEACHER") return `Valutazione docente · ${items.length} elementi`;
    return `Autovalutazione · ${Object.keys(r.answers as object).length} risposte`;
  };

  return (
    <>
      <PageHeader eyebrow="Ascolta, osserva, restituisci" title="Valutazioni e progressi"
        subtitle="Questionari compilati, risultati automatici e commenti personalizzati da pubblicare."
        actions={<ButtonLink icon="send" href="/docente/valutazioni/assegna">Assegna un test</ButtonLink>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Da revisionare" value={String(toReviewCount).padStart(2, "0")} hint="La pubblicazione è manuale" hintTone="wine" />
        <Stat label="Questionari completati" value={String(completedMonth).padStart(2, "0")} hint="Questo mese" />
        <Stat label="In attesa delle allieve" value={String(waiting).padStart(2, "0")} hint="Inviati o aperti" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <PanelTitle title={vista === "pubblicati" ? "Risultati pubblicati" : "Compilazioni da rivedere"} action={vista !== "pubblicati" && toReviewCount > 0 && <Badge tone="amber">{toReviewCount} in attesa</Badge>} />
          <div className="mb-4">
            <FilterChips active={vista} items={[
              { value: "da-rivedere", label: "Da rivedere", href: "?vista=da-rivedere" },
              { value: "pubblicati", label: "Pubblicati", href: "?vista=pubblicati" },
            ]} />
          </div>
          {responses.length ? (
            <ul>
              {responses.map((r) => {
                const s = r.assignment.enrollment.student;
                return (
                  <li key={r.id} className="flex items-center gap-3.5 border-b border-[#f2edeb] py-3.5 last:border-b-0">
                    <Initials name={`${s.firstName} ${s.lastName}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{shortName(s.firstName, s.lastName)} · {r.assignment.version.template.title}</div>
                      <div className="mt-0.5 text-xs text-muted">{describe(r)} · {r.submittedAt ? relativeDay(r.submittedAt) : ""}</div>
                    </div>
                    <ButtonLink size="sm" variant="secondary" href={`/docente/compilazioni/${r.assignmentId}`}>{vista === "pubblicati" ? "Apri" : "Rivedi"}</ButtonLink>
                  </li>
                );
              })}
            </ul>
          ) : <Empty icon="check">{vista === "pubblicati" ? "Nessun risultato pubblicato." : "Nessuna compilazione da rivedere."}</Empty>}
        </Card>

        <Card>
          <PanelTitle title="Evoluzione del percorso" action={selected && <span className="text-xs font-normal text-muted">{shortName(selected.firstName, selected.lastName)}</span>} />
          {students.length > 1 && (
            <form className="mb-4 flex gap-2">
              <select name="allieva" defaultValue={selected?.id} className="input flex-1" aria-label="Allieva">
                {students.map((s) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
              </select>
              <input type="hidden" name="vista" value={vista} />
              <button className="rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-[#654653]">Mostra</button>
            </form>
          )}
          {selected && rows.length ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[10px] border border-[#f2e3df] bg-[#faf4f2] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gold">Valutazione iniziale</div>
                  <div className="font-serif text-[34px] leading-snug text-wine">{fmt1(initial)}<span className="text-sm text-muted"> / 5</span></div>
                  <div className="text-[11px] text-muted">Media su domande confrontabili</div>
                </div>
                <div className="rounded-[10px] border border-[#cfe6da] bg-ok-bg p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ok">Ultima rilevazione</div>
                  <div className="font-serif text-[34px] leading-snug text-ok">{fmt1(latest)}<span className="text-sm text-muted"> / 5</span></div>
                  <div className="text-[11px] text-muted">
                    {initial != null && latest != null ? `${latest - initial >= 0 ? "+" : ""}${fmt1(latest - initial)} punti rispetto all’inizio` : ""}
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {rows.slice(0, 6).map((r) => {
                  const last = [...r.values].reverse().find((v) => v != null) ?? 0;
                  return (
                    <div key={r.key} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-xs text-[#6e6062]" title={r.label}>{r.label}</span>
                      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#f3eeeb]"><span className="absolute h-full rounded-full bg-[#b98b9b]" style={{ width: `${(last / 5) * 100}%` }} /></span>
                      <b className="w-8 text-right text-xs text-wine">{last}</b>
                    </div>
                  );
                })}
              </div>
              <p className="callout mt-5">
                Si confrontano solo domande equivalenti su scale omogenee{self.length ? " (autovalutazione)" : " (competenze osservate)"}. I questionari di benessere e feedback non producono una votazione di competenza.
                {selected && <> <Link className="font-semibold text-wine underline" href={`/docente/allieve/${selected.id}?tab=valutazioni`}>Dettaglio completo</Link></>}
              </p>
            </>
          ) : <Empty icon="chart">L’evoluzione compare quando un’allieva ha almeno due rilevazioni sulla stessa domanda (es. test iniziale e test di fine lezione).</Empty>}
        </Card>
      </div>
    </>
  );
}
