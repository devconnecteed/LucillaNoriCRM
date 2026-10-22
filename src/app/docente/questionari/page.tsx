import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { AUDIENCE_LABELS, PHASE_LABELS, TEMPLATE_STATUS_LABELS } from "@/lib/constants";
import { isQuiz } from "@/lib/questionnaire/logic";
import { parseContent } from "@/lib/questionnaire/schema";
import { createTemplate } from "@/server/questionnaires";
import { Badge, Button, Card, Empty, Field, PageHeader, statusTone } from "@/components/ui";

export const metadata = { title: "Questionari" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ corso?: string; archiviati?: string }> }) {
  await requireStaff();
  const { corso = "", archiviati } = await searchParams;
  const [courseTypes, templates] = await Promise.all([
    db.courseType.findMany({ orderBy: { title: "asc" } }),
    db.questionnaireTemplate.findMany({
      where: { ...(corso ? { courseTypeId: corso } : {}), ...(archiviati ? {} : { status: { not: "ARCHIVED" } }) },
      include: { courseType: true, versions: { orderBy: { version: "desc" } } },
      orderBy: [{ courseTypeId: "asc" }, { title: "asc" }],
    }),
  ]);

  return (
    <>
      <PageHeader title="Questionari e schede" subtitle="Libreria modelli con versioni: le compilazioni restano legate alla versione assegnata." />
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <select name="corso" className="input max-w-56" defaultValue={corso}>
          <option value="">Tutti i corsi</option>
          {courseTypes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="archiviati" defaultChecked={!!archiviati} /> mostra archiviati</label>
        <Button variant="secondary">Filtra</Button>
      </form>

      {templates.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {templates.map((t) => {
            const published = t.versions.find((v) => v.status === "PUBLISHED");
            const draft = t.versions.find((v) => v.status === "DRAFT");
            const latest = published ?? t.versions[0];
            const content = latest ? parseContent(latest.content) : null;
            const nItems = content?.sections.reduce((n, s) => n + s.items.filter((i) => i.type !== "info").length, 0) ?? 0;
            return (
              <Link key={t.id} href={`/docente/questionari/${t.id}`}>
                <Card className="h-full transition hover:border-ln-300">
                  <div className="mb-2 flex flex-wrap gap-1">
                    <Badge tone={statusTone(t.status)}>{TEMPLATE_STATUS_LABELS[t.status]}</Badge>
                    <Badge tone="pink">{PHASE_LABELS[t.phase] ?? t.phase}</Badge>
                    {t.audience === "TEACHER" && <Badge tone="blue">{AUDIENCE_LABELS.TEACHER}</Badge>}
                    {content && isQuiz(content) && <Badge tone="amber">Quiz con punteggio</Badge>}
                    {draft && <Badge>Bozza v{draft.version}</Badge>}
                  </div>
                  <h2 className="font-serif text-lg text-ln-900">{t.title}</h2>
                  <p className="mt-1 text-sm text-stone-600">{t.description}</p>
                  <p className="mt-3 text-xs text-stone-500">
                    {t.courseType?.title ?? "Tutti i corsi"} · {nItems} domande · {published ? `in uso v${published.version}` : "mai pubblicato"}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : <Empty>Nessun modello.</Empty>}

      <Card className="mt-6">
        <h2 className="mb-3 font-medium text-ln-900">Nuovo modello da zero</h2>
        <form action={createTemplate} className="grid gap-3 sm:grid-cols-4">
          <Field label="Titolo"><input className="input" name="title" required /></Field>
          <Field label="Corso">
            <select className="input" name="courseTypeId"><option value="">Tutti</option>{courseTypes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
          </Field>
          <Field label="Fase">
            <select className="input" name="phase">{Object.entries(PHASE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </Field>
          <Field label="Chi compila">
            <select className="input" name="audience">{Object.entries(AUDIENCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </Field>
          <div className="sm:col-span-4"><Button>Crea e apri l’editor</Button></div>
        </form>
        <p className="mt-3 text-xs text-stone-500">Per partire da un modello esistente aprilo e usa “Duplica”.</p>
      </Card>
    </>
  );
}
