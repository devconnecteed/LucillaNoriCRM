import { db } from "@/lib/db";
import { requireStaff, studentScope } from "@/lib/auth";
import { courseLine } from "@/lib/quote";
import { saveQuote } from "@/server/quotes";
import { QuoteBuilder } from "@/components/quote-builder";
import { ButtonLink, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Nuovo preventivo" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ corso?: string; allieva?: string }> }) {
  const user = await requireStaff();
  const { corso, allieva } = await searchParams;
  const [courses, students] = await Promise.all([
    db.courseType.findMany({ where: { status: "ACTIVE" }, orderBy: { title: "asc" } }),
    db.student.findMany({ where: { ...studentScope(user), status: "ACTIVE" }, orderBy: { lastName: "asc" } }),
  ]);
  if (!courses.length) return <Empty>Crea prima una tipologia di corso.</Empty>;

  const course = courses.find((c) => c.id === corso) ?? courses[0];
  const student = students.find((s) => s.id === allieva);
  const lessons = course.durationLessons ?? 1;
  const valid = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Nuovo preventivo" subtitle="Le voci partono dal listino del corso: puoi modificarle, aggiungere extra e sconti."
        actions={<ButtonLink variant="secondary" href="/docente/preventivi">Annulla</ButtonLink>} />
      <QuoteBuilder
        action={saveQuote.bind(null, null)}
        courses={courses}
        students={students.map(({ id, firstName, lastName, email, phone }) => ({ id, firstName, lastName, email, phone }))}
        initial={{
          courseTypeId: course.id,
          studentId: student?.id ?? null,
          prospectFirstName: student?.firstName ?? "",
          prospectLastName: student?.lastName ?? "",
          prospectEmail: student?.email ?? "",
          prospectPhone: student?.phone ?? "",
          lessons,
          lessonMinutes: 60,
          lines: [courseLine(course, lessons)],
          discountPct: 0,
          vatRate: 0,
          validUntil: valid,
          notes: "",
        }}
      />
    </>
  );
}
