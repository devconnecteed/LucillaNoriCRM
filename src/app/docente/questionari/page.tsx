import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PHASE_LABELS } from "@/lib/constants";
import { isQuiz } from "@/lib/questionnaire/logic";
import { parseContent } from "@/lib/questionnaire/schema";
import { Badge, ButtonLink, Empty, FilterChips, PageHeader } from "@/components/ui";

export const metadata = { title: "Questionari" };

const FILTERS: { value: string; label: string; where: object }[] = [
  { value: "tutti", label: "Tutti i modelli", where: { status: { not: "ARCHIVED" } } },
  { value: "iniziali", label: "Iniziali", where: { status: { not: "ARCHIVED" }, phase: { in: ["INITIAL", "PROFILE"] } } },
  { value: "fine-lezione", label: "Fine lezione", where: { status: { not: "ARCHIVED" }, phase: { in: ["LESSON", "FINAL"] }, audience: "STUDENT" } },
  { value: "docente", label: "Per la docente", where: { status: { not: "ARCHIVED" }, audience: "TEACHER" } },
  { value: "esercizi", label: "Esercizi", where: { status: { not: "ARCHIVED" }, phase: "EXERCISES" } },
  { value: "archiviati", label: "Archiviati", where: { status: "ARCHIVED" } },
];

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  await requireStaff();
  const { filtro = "tutti" } = await searchParams;
  const filter = FILTERS.find((f) => f.value === filtro) ?? FILTERS[0];
  const templates = await db.questionnaireTemplate.findMany({
    where: filter.where,
    include: { courseType: true, versions: { orderBy: { version: "desc" } } },
    orderBy: [{ courseTypeId: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader eyebrow="La tua libreria didattica" title="Questionari e schede"
        subtitle="Modelli liberamente personalizzabili, pubblicati per versione."
        actions={<>
          <ButtonLink variant="secondary" icon="send" href="/docente/valutazioni/assegna">Assegna modello</ButtonLink>
          <ButtonLink icon="plus" href="/docente/questionari/nuovo">Nuovo modello</ButtonLink>
        </>} />

      <div className="mb-5"><FilterChips active={filter.value} items={FILTERS.map((f) => ({ value: f.value, label: f.label, href: `?filtro=${f.value}` }))} /></div>

      {templates.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {templates.map((t) => {
            const published = t.versions.find((v) => v.status === "PUBLISHED");
            const draft = t.versions.find((v) => v.status === "DRAFT");
            const latest = published ?? t.versions[0];
            const content = latest ? parseContent(latest.content) : null;
            const nItems = content?.sections.reduce((n, s) => n + s.items.filter((i) => i.type !== "info").length, 0) ?? 0;
            return (
              <Link key={t.id} href={`/docente/questionari/${t.id}`}
                className="flex flex-col rounded-xl border border-line bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-[#dcc0c5]">
                <div className="mb-2.5 text-[9px] font-extrabold uppercase tracking-[0.13em] text-[#a98e91]">{t.courseType?.title ?? "Tutti i corsi"}</div>
                <h2 className="mb-2.5 font-serif text-[22px] leading-tight text-wine-dark">{t.title}</h2>
                <p className="flex-1 text-[13px] leading-relaxed text-muted">{t.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="pink">{PHASE_LABELS[t.phase] ?? t.phase}</Badge>
                  <Badge>Compila: {t.audience === "TEACHER" ? "Docente" : "Allieva"}</Badge>
                  {content && isQuiz(content) && <Badge tone="amber">Quiz con punteggio</Badge>}
                  {draft && <Badge tone="blue">Bozza v{draft.version}</Badge>}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
                  <span>{published ? `v${published.version} pubblicata` : "Mai pubblicato"} · {nItems} elementi</span>
                  <span className="font-semibold text-wine">Apri editor ↗</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : <Empty icon="clipboard">Nessun modello in questo elenco.</Empty>}

      <h2 className="mb-3 mt-9 font-serif text-[23px] text-wine-dark">Come funzionano le versioni</h2>
      <p className="callout">
        Una volta pubblicata, una versione non si modifica più: le assegnazioni e le risposte già inviate restano legate a quella versione.
        Per cambiare un modello si crea una nuova bozza e la si pubblica; da quel momento le nuove assegnazioni usano la versione aggiornata.
      </p>
    </>
  );
}
