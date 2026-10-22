import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { enrollmentWhereForStaff } from "@/lib/guards";
import { AUDIENCE_LABELS, PHASE_LABELS } from "@/lib/constants";
import { assignQuestionnaire } from "@/server/assignments";
import { ActionForm } from "@/components/action-form";
import { Button, ButtonLink, Card, Empty, Field, FormStep, PageHeader } from "@/components/ui";

export const metadata = { title: "Assegna un test" };

export default async function AssignPage({ searchParams }: {
  searchParams: Promise<{ allieva?: string; edizione?: string; modello?: string; lezione?: string }>;
}) {
  const user = await requireStaff();
  const { allieva, edizione, modello, lezione } = await searchParams;
  const scope = enrollmentWhereForStaff(user);

  const [templates, enrollments, lessons] = await Promise.all([
    db.questionnaireTemplate.findMany({ where: { status: "PUBLISHED" }, include: { courseType: true }, orderBy: [{ createdAt: "asc" }] }),
    db.enrollment.findMany({
      where: { ...scope, status: { in: ["NOT_STARTED", "IN_PROGRESS"] }, ...(allieva ? { studentId: allieva } : {}), ...(edizione ? { editionId: edizione } : {}) },
      include: { student: true, edition: { include: { courseType: true } } },
      orderBy: [{ edition: { title: "asc" } }, { student: { lastName: "asc" } }],
    }),
    edizione ? db.lesson.findMany({ where: { editionId: edizione }, orderBy: { number: "asc" } }) : Promise.resolve([]),
  ]);

  // Modelli raggruppati per corso; quelli del corso dell'edizione/allieva in cima
  const focusCourse = enrollments[0]?.edition.courseTypeId;
  const groups = new Map<string, typeof templates>();
  for (const t of [...templates].sort((a, b) => Number(b.courseTypeId === focusCourse) - Number(a.courseTypeId === focusCourse))) {
    const k = t.courseType?.title ?? "Tutti i corsi";
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const narrowed = !!(allieva || edizione);

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Ascolta, osserva, restituisci" title="Assegna un test"
        subtitle="Le allieve ricevono un’email con il link alla loro area riservata. Le schede compilate dalla docente si aprono subito per la compilazione." />
      {enrollments.length ? (
        <Card>
          <ActionForm action={assignQuestionnaire} className="space-y-7">
            <div>
              <FormStep n={1} title="Modello" description="Viene assegnata l’ultima versione pubblicata." />
              <Field label="Questionario o scheda">
                <select className="input" name="templateId" defaultValue={modello}>
                  {[...groups.entries()].map(([course, ts]) => (
                    <optgroup key={course} label={course}>
                      {ts.map((t) => <option key={t.id} value={t.id}>{t.title} · {PHASE_LABELS[t.phase]}{t.audience === "TEACHER" ? ` · ${AUDIENCE_LABELS.TEACHER}` : ""}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
            </div>

            <fieldset>
              <legend className="w-full">
                <FormStep n={2} title="Destinatarie" description={narrowed ? undefined : "Solo iscrizioni attive (da iniziare o in corso)."} />
              </legend>
              {narrowed && <p className="-mt-2 mb-3 text-xs text-muted">Filtrate dal contesto. <Link className="text-wine underline" href="/docente/valutazioni/assegna">Mostra tutte</Link></p>}
              <div className="grid max-h-72 gap-1 overflow-y-auto rounded-[10px] border border-line p-3 sm:grid-cols-2">
                {enrollments.map((e) => (
                  <label key={e.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#faf8f7]">
                    <input type="checkbox" name="enrollmentIds" value={e.id} defaultChecked={narrowed} className="h-4 w-4 accent-[var(--color-wine)]" />
                    <span className="min-w-0"><b className="font-semibold">{e.student.firstName} {e.student.lastName}</b><span className="block truncate text-xs text-muted">{e.edition.title}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <FormStep n={3} title="Tempi" />
              <div className="grid gap-[18px] sm:grid-cols-3">
                {lessons.length > 0 && (
                  <Field label="Lezione collegata">
                    <select className="input" name="lessonId" defaultValue={lezione}>
                      <option value="">—</option>
                      {lessons.map((l) => <option key={l.id} value={l.id}>Lezione {l.number}{l.topic ? ` · ${l.topic}` : ""}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Scadenza" hint="Facoltativa."><input className="input" type="date" name="dueAt" /></Field>
                <Field label="Tentativi consentiti"><input className="input" type="number" name="maxAttempts" min={1} max={10} defaultValue={1} /></Field>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-line pt-5">
              <ButtonLink variant="secondary" href="/docente/valutazioni">Annulla</ButtonLink>
              <Button icon="send">Assegna</Button>
            </div>
          </ActionForm>
        </Card>
      ) : <Empty icon="users">Nessuna iscrizione attiva{narrowed ? " per questo filtro" : ""}. Iscrivi prima un’allieva a un percorso.</Empty>}
    </div>
  );
}
