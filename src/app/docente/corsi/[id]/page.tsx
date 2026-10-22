import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, studentScope } from "@/lib/auth";
import { getEditionForStaff } from "@/lib/guards";
import { relativeDay } from "@/lib/dates";
import { EDITION_STATUS_LABELS, ENROLLMENT_STATUS_LABELS } from "@/lib/constants";
import { addLesson, enrollStudent, saveAttendance, setEnrollmentStatus, updateEdition, updateLesson } from "@/server/courses";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, ButtonLink, Card, DateBox, Empty, Field, Initials, PageHeader, PanelTitle, statusTone } from "@/components/ui";

const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
/** Valore per <input type="datetime-local"> nell'ora locale. */
const toLocalInput = (d: Date | null) => {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const metadata = { title: "Edizione" };

export default async function EditionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  await getEditionForStaff(user, id);
  const edition = await db.courseEdition.findUniqueOrThrow({
    where: { id },
    include: {
      courseType: true,
      teacher: true,
      lessons: { orderBy: { number: "asc" }, include: { attendances: true, _count: { select: { assignments: true } } } },
      enrollments: { include: { student: true, attendances: true }, orderBy: { createdAt: "asc" } },
    },
  });
  const candidates = await db.student.findMany({
    where: { ...studentScope(user), status: "ACTIVE", enrollments: { none: { editionId: id } } },
    orderBy: { lastName: "asc" },
  });
  const totalLessons = edition.lessons.length;
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow={edition.courseType.title}
        title={edition.title}
        subtitle={<span className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(edition.status)}>{EDITION_STATUS_LABELS[edition.status]}</Badge> Docente {edition.teacher.name} · {totalLessons} lezioni · frequenza minima {edition.minAttendancePct}%</span>}
        actions={<ButtonLink variant="secondary" icon="send" href={`/docente/valutazioni/assegna?edizione=${id}`}>Assegna questionario</ButtonLink>}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <PanelTitle title="Lezioni e presenze" action={<form action={addLesson.bind(null, id)}><Button size="sm" variant="secondary" icon="plus">Lezione</Button></form>} />
          {edition.lessons.length ? (
            <ol className="space-y-3">
              {edition.lessons.map((l) => {
                const past = l.date && l.date < now;
                return (
                  <li key={l.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-start gap-3.5">
                      {l.date ? <DateBox date={l.date} /> : <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-lg border border-dashed border-[#e0d3cf] font-serif text-xl text-muted">{l.number}</div>}
                      <form key={`${l.date?.getTime()}-${l.topic}-${l.durationMin}`} action={updateLesson.bind(null, l.id)} className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_190px_90px_auto] sm:items-end">
                        <Field label={`Lezione ${l.number} · argomento`}><input className="input" name="topic" defaultValue={l.topic ?? ""} placeholder="Es. Postura e camminata" /></Field>
                        <Field label="Data e ora"><input className="input" type="datetime-local" name="date" defaultValue={toLocalInput(l.date)} /></Field>
                        <Field label="Minuti"><input className="input" type="number" min={0} name="durationMin" defaultValue={l.durationMin} /></Field>
                        <Button size="sm" variant="ghost">Salva</Button>
                      </form>
                    </div>
                    {edition.enrollments.length > 0 && (
                      <form key={l.attendances.map((a) => `${a.enrollmentId}${a.present}`).join()} action={saveAttendance.bind(null, l.id)}
                        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#f2edeb] pt-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#948a86]">Presenti</span>
                        {edition.enrollments.map((en) => {
                          const att = l.attendances.find((a) => a.enrollmentId === en.id);
                          return (
                            <label key={en.id} className="flex items-center gap-1.5 text-[13px]">
                              <input type="checkbox" name={`present.${en.id}`} defaultChecked={att?.present ?? false} className="h-4 w-4 accent-[var(--color-wine)]" />
                              {en.student.firstName} {en.student.lastName[0]}.
                            </label>
                          );
                        })}
                        <span className="ml-auto flex items-center gap-2">
                          {l.attendances.length > 0 ? <Badge tone="green">Registrate</Badge> : past ? <Badge tone="amber">Da registrare</Badge> : l.date ? <Badge>{relativeDay(l.date)}</Badge> : null}
                          <Button size="sm" variant="secondary">Registra presenze</Button>
                          <ButtonLink size="sm" variant="soft" href={`/docente/valutazioni/assegna?edizione=${id}&lezione=${l.id}`}>Valuta lezione</ButtonLink>
                        </span>
                      </form>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : <Empty icon="calendar">Nessuna lezione: aggiungine una.</Empty>}
        </Card>

        <aside className="space-y-5">
          <Card>
            <PanelTitle title={`Iscritte (${edition.enrollments.length})`} />
            {edition.enrollments.length ? (
              <ul className="divide-y divide-[#f2edeb]">
                {edition.enrollments.map((en) => {
                  const present = en.attendances.filter((a) => a.present).length;
                  const pct = totalLessons ? Math.round((present / totalLessons) * 100) : 0;
                  return (
                    <li key={en.id} className="py-3">
                      <Link href={`/docente/allieve/${en.studentId}`} className="flex items-center gap-3">
                        <Initials name={`${en.student.firstName} ${en.student.lastName}`} />
                        <span className="min-w-0">
                          <span className="block font-semibold hover:text-wine">{en.student.firstName} {en.student.lastName}</span>
                          <span className="block text-xs text-muted">
                            Presenze {present}/{totalLessons} ({pct}%)
                            {pct < edition.minAttendancePct && totalLessons > 0 && <span className="text-warn"> · sotto soglia</span>}
                          </span>
                        </span>
                      </Link>
                      <form key={en.status} action={setEnrollmentStatus.bind(null, en.id)} className="mt-2 flex gap-2">
                        <select name="status" defaultValue={en.status} className="input !min-h-9 flex-1 !py-1.5 text-[13px]" aria-label={`Stato iscrizione di ${en.student.firstName}`}>
                          {Object.entries(ENROLLMENT_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                        <Button size="sm" variant="secondary">Aggiorna</Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty icon="users">Nessuna iscritta.</Empty>}
            {candidates.length > 0 && (
              <form action={enrollStudent} className="mt-4 flex gap-2 border-t border-line pt-4">
                <input type="hidden" name="editionId" value={id} />
                <select name="studentId" className="input flex-1" aria-label="Allieva da iscrivere">
                  {candidates.map((s) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
                </select>
                <Button variant="secondary" icon="plus">Iscrivi</Button>
              </form>
            )}
          </Card>

          <Card>
            <PanelTitle title="Impostazioni" />
            <ActionForm action={updateEdition.bind(null, id)} className="space-y-4">
              <Field label="Titolo"><input className="input" name="title" defaultValue={edition.title} /></Field>
              <Field label="Stato">
                <select className="input" name="status" defaultValue={edition.status}>
                  {Object.entries(EDITION_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Inizio"><input className="input" type="date" name="startDate" defaultValue={toDateInput(edition.startDate)} /></Field>
                <Field label="Fine"><input className="input" type="date" name="endDate" defaultValue={toDateInput(edition.endDate)} /></Field>
              </div>
              <Field label="Frequenza minima per l’attestato (%)"><input className="input" type="number" min={0} max={100} name="minAttendancePct" defaultValue={edition.minAttendancePct} /></Field>
              <Button variant="secondary" className="w-full">Salva impostazioni</Button>
            </ActionForm>
          </Card>
        </aside>
      </div>
    </>
  );
}
