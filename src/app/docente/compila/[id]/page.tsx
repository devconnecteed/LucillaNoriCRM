import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getAssignmentForStaff } from "@/lib/guards";
import { parseContent } from "@/lib/questionnaire/schema";
import type { Answers } from "@/lib/questionnaire/types";
import { openAssignment } from "@/server/assignments";
import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form";
import { PageHeader } from "@/components/ui";

/** Compilazione di una scheda destinata alla docente (es. rubrica di valutazione Sposa). */
export default async function TeacherFillPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  let a = await getAssignmentForStaff(user, id);
  if (a.version.template.audience !== "TEACHER" || a.responses[0]?.status === "SUBMITTED") redirect(`/docente/compilazioni/${id}`);
  if (!a.responses[0]) {
    await openAssignment(id);
    a = await getAssignmentForStaff(user, id);
  }
  return (
    <>
      <PageHeader title={a.version.template.title} subtitle={`${a.enrollment.student.firstName} ${a.enrollment.student.lastName} · ${a.enrollment.edition.title}${a.lesson ? ` · lezione ${a.lesson.number}` : ""}`} />
      <QuestionnaireForm assignmentId={a.id} content={parseContent(a.version.content)} initialAnswers={(a.responses[0]?.answers ?? {}) as Answers} doneHref={`/docente/compilazioni/${a.id}`} />
    </>
  );
}
