import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { AUDIENCE_LABELS, PHASE_LABELS, TEMPLATE_STATUS_LABELS } from "@/lib/constants";
import { parseContent } from "@/lib/questionnaire/schema";
import { discardDraft, duplicateTemplate, setTemplateArchived, startDraft, updateTemplateMeta } from "@/server/questionnaires";
import { ActionForm } from "@/components/action-form";
import { Builder } from "@/components/questionnaire/builder";
import { Badge, Button, ButtonLink, Card, Field, PageHeader, fmtDate, statusTone } from "@/components/ui";

export default async function TemplatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  await requireStaff();
  const { id } = await params;
  const { v } = await searchParams;
  const t = await db.questionnaireTemplate.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" }, include: { _count: { select: { assignments: true } } } }, courseType: true },
  });
  if (!t) notFound();
  const courseTypes = await db.courseType.findMany({ orderBy: { title: "asc" } });

  const draft = t.versions.find((x) => x.status === "DRAFT");
  const selected = (v && t.versions.find((x) => x.version === Number(v))) || draft || t.versions[0];
  const content = parseContent(selected.content);

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={<span className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(t.status)}>{TEMPLATE_STATUS_LABELS[t.status]}</Badge>{PHASE_LABELS[t.phase]} · {AUDIENCE_LABELS[t.audience]} · {t.courseType?.title ?? "Tutti i corsi"}</span>}
        actions={
          <>
            {t.status === "PUBLISHED" && <ButtonLink href={`/docente/valutazioni?modello=${t.id}`}>Assegna</ButtonLink>}
            <form action={duplicateTemplate.bind(null, t.id)}><Button variant="secondary">Duplica</Button></form>
            <form action={setTemplateArchived.bind(null, t.id, t.status !== "ARCHIVED")}><Button variant="ghost">{t.status === "ARCHIVED" ? "Ripristina" : "Archivia"}</Button></form>
          </>
        }
      />

      <div className="grid gap-6 2xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {selected.status === "PUBLISHED" && !draft && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-ln-50 p-4 text-sm text-ln-900">
              Questa versione è pubblicata e non si può modificare: le compilazioni già consegnate restano invariate.
              <form action={startDraft.bind(null, t.id)}><Button>Crea nuova versione (bozza)</Button></form>
            </div>
          )}
          {selected.status === "PUBLISHED" && draft && selected.id !== draft.id && (
            <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Stai guardando la v{selected.version}. <Link className="underline" href={`/docente/questionari/${t.id}`}>Apri la bozza v{draft.version}</Link>
            </div>
          )}
          <Builder key={selected.id} versionId={selected.id} version={selected.version} initial={content} readOnly={selected.status !== "DRAFT"} />
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="mb-3 font-serif text-lg text-ln-900">Versioni</h2>
            <ul className="space-y-2 text-sm">
              {t.versions.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2">
                  <Link href={`/docente/questionari/${t.id}?v=${x.version}`} className={x.id === selected.id ? "font-semibold text-ln-800" : "hover:text-ln-700"}>
                    v{x.version} · {x.status === "DRAFT" ? "bozza" : `pubbl. ${fmtDate(x.publishedAt)}`}
                  </Link>
                  <span className="text-xs text-stone-500">{x._count.assignments} assegn.</span>
                </li>
              ))}
            </ul>
            {draft && t.versions.length > 1 && (
              <form action={discardDraft.bind(null, draft.id)} className="mt-3"><Button variant="ghost">Scarta bozza v{draft.version}</Button></form>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-serif text-lg text-ln-900">Dati del modello</h2>
            <ActionForm action={updateTemplateMeta.bind(null, t.id)} className="space-y-3">
              <Field label="Titolo"><input className="input" name="title" defaultValue={t.title} /></Field>
              <Field label="Descrizione"><textarea className="input" name="description" defaultValue={t.description ?? ""} /></Field>
              <Field label="Corso">
                <select className="input" name="courseTypeId" defaultValue={t.courseTypeId ?? ""}><option value="">Tutti</option>{courseTypes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
              </Field>
              <Field label="Fase">
                <select className="input" name="phase" defaultValue={t.phase}>{Object.entries(PHASE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </Field>
              <Field label="Chi compila">
                <select className="input" name="audience" defaultValue={t.audience}>{Object.entries(AUDIENCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </Field>
              <Button variant="secondary">Salva dati</Button>
            </ActionForm>
            {t.sourceFile && <p className="mt-3 text-xs text-stone-500">Origine: {t.sourceFile}</p>}
          </Card>
        </aside>
      </div>
    </>
  );
}
