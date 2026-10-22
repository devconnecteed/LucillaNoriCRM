import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { enrollmentWhereForStaff } from "@/lib/guards";
import { AUDIENCE_LABELS } from "@/lib/constants";
import { assignQuestionnaire } from "@/server/assignments";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, Card, Empty, Field, PageHeader, Table, Td, fmtDate } from "@/components/ui";

export const metadata = { title: "Valutazioni" };

export default async function ReviewsPage({ searchParams }: {
  searchParams: Promise<{ allieva?: string; edizione?: string; modello?: string; vista?: string }>;
}) {
  const user = await requireStaff();
  const { allieva, edizione, modello, vista = "da-pubblicare" } = await searchParams;
  const scope = enrollmentWhereForStaff(user);

  const [templates, enrollments, lessons, responses] = await Promise.all([
    db.questionnaireTemplate.findMany({ where: { status: "PUBLISHED" }, include: { courseType: true }, orderBy: [{ courseTypeId: "asc" }, { title: "asc" }] }),
    db.enrollment.findMany({
      where: { ...scope, status: { in: ["NOT_STARTED", "IN_PROGRESS"] }, ...(allieva ? { studentId: allieva } : {}), ...(edizione ? { editionId: edizione } : {}) },
      include: { student: true, edition: true },
      orderBy: [{ edition: { title: "asc" } }, { student: { lastName: "asc" } }],
    }),
    edizione ? db.lesson.findMany({ where: { editionId: edizione }, orderBy: { number: "asc" } }) : Promise.resolve([]),
    db.response.findMany({
      where: {
        status: "SUBMITTED",
        published: vista === "pubblicati",
        assignment: { enrollment: scope },
      },
      include: { assignment: { include: { version: { include: { template: true } }, enrollment: { include: { student: true } } } } },
      orderBy: { submittedAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <>
      <PageHeader title="Valutazioni" subtitle="Assegna questionari, rivedi le compilazioni e pubblica i risultati." />

      <Card className="mb-8">
        <h2 className="mb-4 font-serif text-lg text-ln-900">Assegna un questionario</h2>
        {enrollments.length ? (
          <ActionForm action={assignQuestionnaire} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Modello (ultima versione pubblicata)">
                <select className="input" name="templateId" defaultValue={modello}>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.courseType ? `${t.courseType.title} · ` : ""}{t.title}{t.audience === "TEACHER" ? " (docente)" : ""}</option>)}
                </select>
              </Field>
              {lessons.length > 0 && (
                <Field label="Lezione (facoltativa)">
                  <select className="input" name="lessonId"><option value="">—</option>{lessons.map((l) => <option key={l.id} value={l.id}>Lezione {l.number}{l.topic ? ` – ${l.topic}` : ""}</option>)}</select>
                </Field>
              )}
              <Field label="Scadenza (facoltativa)"><input className="input" type="date" name="dueAt" /></Field>
              <Field label="Tentativi consentiti"><input className="input" type="number" name="maxAttempts" min={1} max={10} defaultValue={1} /></Field>
            </div>
            <fieldset>
              <legend className="label">Destinatarie {allieva || edizione ? <Link className="ml-2 text-xs text-ln-700 underline" href="/docente/valutazioni">mostra tutte</Link> : null}</legend>
              <div className="grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-stone-200 p-3 sm:grid-cols-2">
                {enrollments.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="enrollmentIds" value={e.id} defaultChecked={!!(allieva || edizione)} />
                    {e.student.firstName} {e.student.lastName} <span className="text-stone-400">· {e.edition.title}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-stone-500">Le allieve ricevono un’email con il link alla loro area riservata. Le schede “{AUDIENCE_LABELS.TEACHER}” si aprono per la compilazione.</p>
            <Button>Assegna</Button>
          </ActionForm>
        ) : <Empty>Nessuna iscrizione attiva. Iscrivi prima un’allieva a un corso.</Empty>}
      </Card>

      <div className="mb-3 flex gap-2">
        <Link href="?vista=da-pubblicare" className={`rounded-full px-3 py-1 text-sm ${vista !== "pubblicati" ? "bg-ln-700 text-white" : "bg-white text-ln-800 ring-1 ring-ln-200"}`}>Da rivedere</Link>
        <Link href="?vista=pubblicati" className={`rounded-full px-3 py-1 text-sm ${vista === "pubblicati" ? "bg-ln-700 text-white" : "bg-white text-ln-800 ring-1 ring-ln-200"}`}>Pubblicati</Link>
      </div>
      {responses.length ? (
        <Table head={["Allieva", "Questionario", "Consegnato", "Punteggio", ""]}>
          {responses.map((r) => (
            <tr key={r.id} className="hover:bg-ln-50/50">
              <Td>{r.assignment.enrollment.student.firstName} {r.assignment.enrollment.student.lastName}</Td>
              <Td>{r.assignment.version.template.title} <span className="text-stone-400">v{r.assignment.version.version}</span>{r.assignment.version.template.audience === "TEACHER" && <> <Badge tone="blue">docente</Badge></>}</Td>
              <Td>{fmtDate(r.submittedAt)}</Td>
              <Td>{r.maxScore ? `${r.manualScore ?? r.autoScore}/${r.maxScore}` : "—"}</Td>
              <Td><Link className="text-ln-700 underline" href={`/docente/compilazioni/${r.assignmentId}`}>Apri</Link></Td>
            </tr>
          ))}
        </Table>
      ) : <Empty>{vista === "pubblicati" ? "Nessun risultato pubblicato." : "Nessuna compilazione da rivedere."}</Empty>}
    </>
  );
}
