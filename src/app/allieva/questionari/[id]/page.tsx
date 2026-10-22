import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { effectiveStatus, getAssignmentForStudent } from "@/lib/guards";
import { parseContent } from "@/lib/questionnaire/schema";
import { stripAnswerKey } from "@/lib/questionnaire/logic";
import type { Answers } from "@/lib/questionnaire/types";
import { openAssignment } from "@/server/assignments";
import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form";
import { CompletionScreen } from "@/components/questionnaire/completion-screen";

export const metadata = { title: "Questionario" };

export default async function FillPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("STUDENT");
  const { id } = await params;
  let a = await getAssignmentForStudent(user, id);
  const current = a.responses[0];

  if (current?.status === "SUBMITTED") {
    if (current.published) redirect(`/allieva/risultati/${current.id}`);
    return <CompletionScreen title="Grazie!" message={`Hai consegnato “${a.version.template.title}”. La tua insegnante lo leggerà e ti invierà il suo riscontro.`} href="/allieva" cta="Torna alla tua area" />;
  }
  if (effectiveStatus(a) === "EXPIRED") {
    return <CompletionScreen tone="warn" icon="calendar" title="Questionario scaduto" message="Se vuoi ancora compilarlo, chiedi una proroga alla tua insegnante." href="/allieva" cta="Torna alla tua area" />;
  }
  if (!current || a.status === "SENT") {
    await openAssignment(id);
    a = await getAssignmentForStudent(user, id);
  }

  // Compilazione a schermo intero (vedi QuestionnaireForm): la pagina mostra solo il form.
  return (
    <QuestionnaireForm
      assignmentId={a.id}
      title={a.version.template.title}
      content={stripAnswerKey(parseContent(a.version.content))}
      initialAnswers={(a.responses[0]?.answers ?? {}) as Answers}
      closeHref="/allieva"
      doneHref="/allieva"
    />
  );
}
