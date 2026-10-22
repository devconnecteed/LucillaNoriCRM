import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { effectiveStatus, getAssignmentForStudent } from "@/lib/guards";
import { parseContent } from "@/lib/questionnaire/schema";
import { stripAnswerKey } from "@/lib/questionnaire/logic";
import type { Answers } from "@/lib/questionnaire/types";
import { openAssignment } from "@/server/assignments";
import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form";
import { ButtonLink, Card } from "@/components/ui";

export const metadata = { title: "Questionario" };

export default async function FillPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("STUDENT");
  const { id } = await params;
  let a = await getAssignmentForStudent(user, id);
  const current = a.responses[0];

  if (current?.status === "SUBMITTED") {
    if (current.published) redirect(`/allieva/risultati/${current.id}`);
    return (
      <Card className="text-center">
        <h1 className="mb-2 font-serif text-[24px] text-wine-dark">Grazie! Hai consegnato “{a.version.template.title}”.</h1>
        <p className="mb-4 text-sm text-muted">La tua insegnante lo leggerà e ti invierà il suo riscontro.</p>
        <ButtonLink href="/allieva">Torna alla tua area</ButtonLink>
      </Card>
    );
  }
  if (effectiveStatus(a) === "EXPIRED") {
    return (
      <Card className="text-center">
        <h1 className="mb-2 font-serif text-[24px] text-wine-dark">Questionario scaduto</h1>
        <p className="mb-4 text-sm text-muted">Se vuoi ancora compilarlo, chiedi una proroga alla tua insegnante.</p>
        <ButtonLink href="/allieva">Torna alla tua area</ButtonLink>
      </Card>
    );
  }
  if (!current || a.status === "SENT") {
    await openAssignment(id);
    a = await getAssignmentForStudent(user, id);
  }

  return (
    <>
      <h1 className="mb-1 font-serif text-[30px] text-wine-dark">{a.version.template.title}</h1>
      <p className="mb-4 text-sm text-muted">{a.enrollment.edition.courseType.title}{a.lesson && ` · lezione ${a.lesson.number}`}</p>
      <QuestionnaireForm
        assignmentId={a.id}
        content={stripAnswerKey(parseContent(a.version.content))}
        initialAnswers={(a.responses[0]?.answers ?? {}) as Answers}
        doneHref={`/allieva/questionari/${a.id}`}
      />
    </>
  );
}
