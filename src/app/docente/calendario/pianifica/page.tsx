import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff, editionScope } from "@/lib/auth";
import { LessonPlanner, type PlannerEdition } from "@/components/lesson-planner";
import { ButtonLink, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Pianifica lezione" };

export default async function PlanLessonPage({ searchParams }: { searchParams: Promise<{ data?: string; lezione?: string }> }) {
  const user = await requireStaff();
  const { data, lezione } = await searchParams;

  const editions = await db.courseEdition.findMany({
    where: { ...editionScope(user), status: { in: ["PLANNED", "RUNNING"] } },
    include: {
      courseType: true,
      teacher: true,
      lessons: { orderBy: { number: "asc" } },
      enrollments: { where: { status: { in: ["NOT_STARTED", "IN_PROGRESS"] } }, include: { student: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let initialEditionId: string | undefined;
  let rescheduling = false;
  if (lezione) {
    const lesson = await db.lesson.findFirst({ where: { id: lezione, edition: editionScope(user) } });
    if (!lesson) notFound();
    initialEditionId = lesson.editionId;
    rescheduling = !!lesson.date;
  }
  const defaultDate = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : new Date().toISOString().slice(0, 10);

  const plannerEditions: PlannerEdition[] = editions.map((e) => ({
    id: e.id,
    title: e.title,
    course: e.courseType.title,
    teacher: { name: e.teacher.name, email: e.teacher.email },
    recipients: e.enrollments.map(({ student: s }) => s.isMinor && s.guardianEmail
      ? { name: `${s.firstName} ${s.lastName}`, email: s.guardianEmail, note: `al tutore ${s.guardianName ?? ""}`.trim() }
      : { name: `${s.firstName} ${s.lastName}`, email: s.email }),
    lessons: e.lessons.map((l) => ({ id: l.id, number: l.number, topic: l.topic, date: l.date?.toISOString() ?? null, durationMin: l.durationMin, location: l.location })),
  }));

  return (
    <div className="max-w-6xl">
      <PageHeader eyebrow="Agenda didattica" title={rescheduling ? "Modifica lezione" : "Pianifica lezione"}
        subtitle="Fissa data, ora e luogo: docente e allieve ricevono l’invito da aggiungere al proprio calendario." />
      {plannerEditions.length ? (
        <LessonPlanner editions={plannerEditions} initialEditionId={initialEditionId} initialLessonId={lezione} defaultDate={defaultDate} />
      ) : (
        <Empty icon="book">
          Nessuna edizione aperta. <ButtonLink size="sm" variant="secondary" href="/docente/corsi/edizioni/nuova">Crea un’edizione</ButtonLink>
        </Empty>
      )}
    </div>
  );
}
