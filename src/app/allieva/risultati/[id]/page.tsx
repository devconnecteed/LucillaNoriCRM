import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseContent } from "@/lib/questionnaire/schema";
import type { Answers } from "@/lib/questionnaire/types";
import { fmtScore } from "@/lib/format";
import { AnswerDisplay, CorrectnessHint } from "@/components/questionnaire/answer-display";
import { ButtonLink, Card, fmtDate } from "@/components/ui";

export const metadata = { title: "Risultato" };

/** Risultato pubblicato dalla docente: unica vista in cui l'allieva vede correzioni e feedback. */
export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("STUDENT");
  const { id } = await params;
  const r = await db.response.findFirst({
    where: { id, published: true, assignment: { enrollment: { studentId: user.student?.id ?? "-" } } },
    include: { assignment: { include: { version: { include: { template: true } } } } },
  });
  if (!r) notFound();
  const content = parseContent(r.assignment.version.content);
  const answers = r.answers as Answers;
  const isTeacherSheet = r.assignment.version.template.audience === "TEACHER";
  const score = r.manualScore ?? r.autoScore;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[30px] text-wine-dark">{r.assignment.version.template.title}</h1>
        <p className="text-sm text-muted">Pubblicato il {fmtDate(r.publishedAt)}</p>
      </div>
      {r.maxScore && score !== null && (
        <Card className="text-center">
          <div className="text-xs uppercase tracking-wide text-muted">Punteggio</div>
          <div className="font-serif text-4xl text-wine">{fmtScore(score, r.maxScore)}</div>
        </Card>
      )}
      {r.teacherFeedback && (
        <Card className="border-ln-200 bg-ln-50">
          <h2 className="mb-2 font-serif text-[22px] text-wine-dark">Il commento della tua insegnante</h2>
          <p className="whitespace-pre-wrap text-sm">{r.teacherFeedback}</p>
        </Card>
      )}
      {content.sections.map((s) => (
        <Card key={s.id}>
          <h2 className="mb-3 font-serif text-[22px] text-wine-dark">{s.title}</h2>
          <dl className="space-y-3 text-sm">
            {s.items.filter((i) => i.type !== "info").map((i) => (
              <div key={i.id} className="rounded-lg bg-[#faf8f7] p-3">
                <dt className="text-muted">{i.label}</dt>
                <dd className="mt-1 font-medium"><AnswerDisplay item={i} value={answers[i.id]} /></dd>
                {!isTeacherSheet && <CorrectnessHint item={i} value={answers[i.id]} />}
              </div>
            ))}
          </dl>
        </Card>
      ))}
      <ButtonLink variant="secondary" href="/allieva">← Torna alla tua area</ButtonLink>
    </div>
  );
}
