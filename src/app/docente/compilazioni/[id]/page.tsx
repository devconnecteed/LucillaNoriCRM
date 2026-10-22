import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { effectiveStatus, getAssignmentForStaff } from "@/lib/guards";
import { ASSIGNMENT_STATUS_LABELS } from "@/lib/constants";
import { parseContent } from "@/lib/questionnaire/schema";
import { scoreAnswers } from "@/lib/questionnaire/logic";
import type { Answers } from "@/lib/questionnaire/types";
import { cancelAssignment, extendAssignment, remindAssignment, reopenResponse, reviewResponse } from "@/server/assignments";
import { ActionForm } from "@/components/action-form";
import { AnswerDisplay, CorrectnessHint } from "@/components/questionnaire/answer-display";
import { Badge, Button, ButtonLink, Card, Field, PageHeader, fmtDate, fmtDateTime, statusTone } from "@/components/ui";

export default async function ResponsePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const a = await getAssignmentForStaff(user, id);
  const content = parseContent(a.version.content);
  const r = a.responses[0];
  const answers = (r?.answers ?? {}) as Answers;
  const submitted = r?.status === "SUBMITTED";
  const st = effectiveStatus(a);
  const score = submitted ? scoreAnswers(content, answers) : null;
  const student = a.enrollment.student;

  return (
    <>
      <PageHeader
        title={a.version.template.title}
        subtitle={<span className="flex flex-wrap items-center gap-2">
          <Link className="text-ln-700 underline" href={`/docente/allieve/${student.id}`}>{student.firstName} {student.lastName}</Link>
          · {a.enrollment.edition.title}{a.lesson && ` · lezione ${a.lesson.number}`} · v{a.version.version}
          <Badge tone={statusTone(st)}>{ASSIGNMENT_STATUS_LABELS[st]}</Badge>
          {r?.published && <Badge tone="pink">Pubblicato all’allieva</Badge>}
        </span>}
        actions={a.version.template.audience === "TEACHER" && !submitted ? <ButtonLink href={`/docente/compila/${a.id}`}>Compila scheda</ButtonLink> : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {!submitted && (
            <Card className="text-sm text-stone-600">
              {r ? `Compilazione in corso (ultimo salvataggio ${fmtDateTime(r.updatedAt)}). Le risposte in bozza non sono visibili finché non vengono consegnate.` : "Non ancora aperto."}
            </Card>
          )}
          {submitted && content.sections.map((s) => (
            <Card key={s.id}>
              <h2 className="mb-3 font-serif text-lg text-ln-900">{s.title}</h2>
              <dl className="space-y-3 text-sm">
                {s.items.filter((i) => i.type !== "info").map((i) => (
                  <div key={i.id} className="rounded-lg bg-stone-50 p-3">
                    <dt className="text-stone-600">{i.label}</dt>
                    <dd className="mt-1 font-medium"><AnswerDisplay item={i} value={answers[i.id]} /></dd>
                    <CorrectnessHint item={i} value={answers[i.id]} />
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>

        <aside className="space-y-6">
          {submitted && r && (
            <Card>
              <h2 className="mb-3 font-serif text-lg text-ln-900">Revisione e pubblicazione</h2>
              <p className="mb-3 text-sm text-stone-600">Consegnato il {fmtDateTime(r.submittedAt)} · tentativo {r.attempt}/{a.maxAttempts}</p>
              {score && score.maxScore > 0 && (
                <p className="mb-3 rounded-lg bg-ln-50 p-3 text-sm">Punteggio automatico: <b>{score.score}/{score.maxScore}</b> ({score.percent}%)</p>
              )}
              <ActionForm action={reviewResponse.bind(null, r.id)} className="space-y-3">
                {score && score.maxScore > 0 && (
                  <>
                    <Field label="Punteggio rivisto (facoltativo)"><input className="input" name="manualScore" inputMode="decimal" defaultValue={r.manualScore ?? ""} /></Field>
                    <Field label="Motivo della revisione"><input className="input" name="scoreNote" defaultValue={r.scoreNote ?? ""} /></Field>
                  </>
                )}
                <Field label="Feedback per l’allieva" hint="Visibile all’allieva solo dopo la pubblicazione.">
                  <textarea className="input min-h-32" name="teacherFeedback" defaultValue={r.teacherFeedback ?? ""} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" name="intent" value="save">Salva</Button>
                  {r.published
                    ? <Button variant="danger" name="intent" value="unpublish">Ritira pubblicazione</Button>
                    : <Button name="intent" value="publish">Salva e pubblica</Button>}
                </div>
              </ActionForm>
              <form action={reopenResponse.bind(null, a.id)} className="mt-4 border-t border-stone-100 pt-4">
                <Button variant="ghost">Riapri per modifiche {r.attempt < a.maxAttempts ? "(nuovo tentativo)" : ""}</Button>
              </form>
            </Card>
          )}

          {!submitted && (
            <Card className="space-y-4">
              <h2 className="font-serif text-lg text-ln-900">Gestione</h2>
              <p className="text-sm text-stone-600">Assegnato il {fmtDate(a.createdAt)}{a.dueAt && ` · scadenza ${fmtDate(a.dueAt)}`}</p>
              {a.version.template.audience === "STUDENT" && (
                <form action={remindAssignment.bind(null, a.id)}><Button variant="secondary" className="w-full">Invia sollecito</Button></form>
              )}
              <form action={extendAssignment.bind(null, a.id)} className="flex gap-2">
                <input className="input" type="date" name="dueAt" aria-label="Nuova scadenza" defaultValue={a.dueAt?.toISOString().slice(0, 10)} />
                <Button variant="secondary">Proroga</Button>
              </form>
              <form action={cancelAssignment.bind(null, a.id)}><Button variant="danger" className="w-full">Annulla assegnazione</Button></form>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
