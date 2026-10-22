import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getAssignmentForStaff } from "@/lib/guards";
import { parseContent } from "@/lib/questionnaire/schema";
import type { Answers } from "@/lib/questionnaire/types";
import { openAssignment } from "@/server/assignments";
import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form";

export const metadata = { title: "Scheda docente" };

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
    <QuestionnaireForm
      assignmentId={a.id}
      title={`${a.version.template.title} · ${a.enrollment.student.firstName} ${a.enrollment.student.lastName}`}
      content={parseContent(a.version.content)}
      initialAnswers={(a.responses[0]?.answers ?? {}) as Answers}
      closeHref={`/docente/allieve/${a.enrollment.studentId}?tab=questionari`}
      doneHref={`/docente/compilazioni/${a.id}`}
      doneMessage="Scheda completata. Ora puoi rivederla, aggiungere un commento e pubblicarla all’allieva."
    />
  );
}
