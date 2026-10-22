import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, studentScope } from "@/lib/auth";
import { getEditionForStaff } from "@/lib/guards";
import { EDITION_STATUS_LABELS, ENROLLMENT_STATUS_LABELS } from "@/lib/constants";
import { addLesson, enrollStudent, saveAttendance, setEnrollmentStatus, updateEdition, updateLesson } from "@/server/courses";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, ButtonLink, Card, Empty, Field, PageHeader, statusTone } from "@/components/ui";

const toInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  await getEditionForStaff(user, id);
  const edition = await db.courseEdition.findUniqueOrThrow({
    where: { id },
    include: {
      courseType: true,
      teacher: true,
      lessons: { orderBy: { number: "asc" }, include: { attendances: true } },
      enrollments: { include: { student: true, attendances: true }, orderBy: { createdAt: "asc" } },
    },
  });
  const candidates = await db.student.findMany({
    where: { ...studentScope(user), status: "ACTIVE", enrollments: { none: { editionId: id } } },
    orderBy: { lastName: "asc" },
  });
  const totalLessons = edition.lessons.length;

  return (
    <>
      <PageHeader
        title={edition.title}
        subtitle={<>{edition.courseType.title} · docente {edition.teacher.name} · <Badge tone={statusTone(edition.status)}>{EDITION_STATUS_LABELS[edition.status]}</Badge></>}
        actions={<ButtonLink variant="secondary" href={`/docente/valutazioni?edizione=${id}`}>Assegna questionario al gruppo</ButtonLink>}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <h2 className="mb-4 font-serif text-lg text-ln-900">Iscritte ({edition.enrollments.length})</h2>
            {edition.enrollments.length ? (
              <ul className="divide-y divide-stone-100">
                {edition.enrollments.map((en) => {
                  const present = en.attendances.filter((a) => a.present).length;
                  const pct = totalLessons ? Math.round((present / totalLessons) * 100) : 0;
                  return (
                    <li key={en.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <Link className="font-medium text-ln-800 hover:underline" href={`/docente/allieve/${en.studentId}`}>{en.student.firstName} {en.student.lastName}</Link>
                        <div className="text-xs text-stone-500">Presenze {present}/{totalLessons} ({pct}%) {pct < edition.minAttendancePct && totalLessons > 0 && <span className="text-amber-700">· sotto soglia {edition.minAttendancePct}%</span>}</div>
                      </div>
                      <form key={en.status} action={setEnrollmentStatus.bind(null, en.id)} className="flex gap-2">
                        <select name="status" defaultValue={en.status} className="input max-w-40 text-sm" aria-label="Stato iscrizione">
                          {Object.entries(ENROLLMENT_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                        <Button variant="secondary">Aggiorna</Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty>Nessuna iscritta.</Empty>}
            {candidates.length > 0 && (
              <form action={enrollStudent} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="editionId" value={id} />
                <select name="studentId" className="input max-w-sm" aria-label="Allieva da iscrivere">
                  {candidates.map((s) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
                </select>
                <Button variant="secondary">Iscrivi</Button>
              </form>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg text-ln-900">Lezioni e presenze</h2>
              <form action={addLesson.bind(null, id)}><Button variant="secondary">+ Lezione</Button></form>
            </div>
            {edition.lessons.length ? (
              <div className="space-y-4">
                {edition.lessons.map((l) => (
                  <div key={l.id} className="rounded-xl border border-stone-200 p-4">
                    <form key={`${l.date?.getTime()}-${l.topic}-${l.durationMin}`} action={updateLesson.bind(null, l.id)} className="flex flex-wrap items-end gap-2">
                      <span className="mb-2 font-serif text-lg text-ln-800">{l.number}.</span>
                      <label className="text-xs text-stone-600">Data<input className="input" type="date" name="date" defaultValue={toInput(l.date)} /></label>
                      <label className="min-w-40 flex-1 text-xs text-stone-600">Argomento<input className="input" name="topic" defaultValue={l.topic ?? ""} /></label>
                      <label className="w-24 text-xs text-stone-600">Minuti<input className="input" type="number" min={0} name="durationMin" defaultValue={l.durationMin} /></label>
                      <Button variant="ghost">Salva</Button>
                    </form>
                    {edition.enrollments.length > 0 && (
                      <form key={l.attendances.map((a) => `${a.enrollmentId}${a.present}`).join()} action={saveAttendance.bind(null, l.id)} className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
                        <span className="text-xs font-medium text-stone-500">Presenti:</span>
                        {edition.enrollments.map((en) => {
                          const att = l.attendances.find((a) => a.enrollmentId === en.id);
                          return (
                            <label key={en.id} className="flex items-center gap-1 text-sm">
                              <input type="checkbox" name={`present.${en.id}`} defaultChecked={att?.present ?? false} />
                              {en.student.firstName} {en.student.lastName[0]}.
                            </label>
                          );
                        })}
                        <Button variant="secondary" className="ml-auto">Registra presenze</Button>
                        {l.attendances.length > 0 && <span className="text-xs text-emerald-700">registrate</span>}
                      </form>
                    )}
                  </div>
                ))}
              </div>
            ) : <Empty>Nessuna lezione.</Empty>}
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="mb-4 font-serif text-lg text-ln-900">Impostazioni edizione</h2>
          <ActionForm action={updateEdition.bind(null, id)} className="space-y-3">
            <Field label="Titolo"><input className="input" name="title" defaultValue={edition.title} /></Field>
            <Field label="Stato">
              <select className="input" name="status" defaultValue={edition.status}>
                {Object.entries(EDITION_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Inizio"><input className="input" type="date" name="startDate" defaultValue={toInput(edition.startDate)} /></Field>
            <Field label="Fine"><input className="input" type="date" name="endDate" defaultValue={toInput(edition.endDate)} /></Field>
            <Field label="Frequenza minima per attestato (%)"><input className="input" type="number" min={0} max={100} name="minAttendancePct" defaultValue={edition.minAttendancePct} /></Field>
            <Button>Salva</Button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
