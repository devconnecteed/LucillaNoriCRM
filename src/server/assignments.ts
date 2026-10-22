"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff, requireUser, type CurrentUser } from "@/lib/auth";
import { effectiveStatus, enrollmentWhereForStaff, getAssignmentForStaff, getAssignmentForStudent } from "@/lib/guards";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/notify";
import { ROLES } from "@/lib/constants";
import { missingRequired, scoreAnswers } from "@/lib/questionnaire/logic";
import { parseContent } from "@/lib/questionnaire/schema";
import type { Answers } from "@/lib/questionnaire/types";
import type { ActionState } from "./students";

// ------------------------------------------------------------------ Assegnazione (docente)

export async function assignQuestionnaire(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const templateId = String(form.get("templateId") ?? "");
  const enrollmentIds = form.getAll("enrollmentIds").map(String);
  if (!enrollmentIds.length) return { error: "Seleziona almeno un’iscrizione." };

  const version = await db.templateVersion.findFirst({
    where: { templateId, status: "PUBLISHED", template: { status: { not: "ARCHIVED" } } },
    orderBy: { version: "desc" },
    include: { template: true },
  });
  if (!version) return { error: "Il modello non ha versioni pubblicate." };

  const enrollments = await db.enrollment.findMany({
    where: { id: { in: enrollmentIds }, ...enrollmentWhereForStaff(user) },
    include: { student: true, edition: true },
  });
  if (enrollments.length !== enrollmentIds.length) return { error: "Una o più iscrizioni non sono accessibili." };

  const lessonId = String(form.get("lessonId") || "") || null;
  const dueAt = form.get("dueAt") ? new Date(`${form.get("dueAt")}T23:59:59`) : null;
  const maxAttempts = Math.max(1, Number(form.get("maxAttempts") || 1));

  for (const en of enrollments) {
    const lesson = lessonId ? await db.lesson.findFirst({ where: { id: lessonId, editionId: en.editionId } }) : null;
    const a = await db.assignment.create({
      data: { versionId: version.id, enrollmentId: en.id, lessonId: lesson?.id ?? null, assignedById: user.id, dueAt, maxAttempts },
    });
    if (version.template.audience === "STUDENT") {
      const to = en.student.isMinor && en.student.guardianEmail ? en.student.guardianEmail : en.student.email;
      await sendEmail(
        to,
        `Nuovo questionario: ${version.template.title}`,
        `Ciao ${en.student.firstName},\n\nhai un nuovo questionario da compilare nella tua area riservata:\n${process.env.APP_URL}/allieva/questionari/${a.id}\n${dueAt ? `\nDa completare entro il ${dueAt.toLocaleDateString("it-IT")}.` : ""}`,
      );
    }
    await audit(user.id, "assignment.create", "Assignment", a.id, { versionId: version.id });
  }
  revalidatePath("/docente");
  if (version.template.audience === "TEACHER" && enrollments.length === 1) {
    const a = await db.assignment.findFirstOrThrow({ where: { enrollmentId: enrollments[0].id, versionId: version.id }, orderBy: { createdAt: "desc" } });
    redirect(`/docente/compila/${a.id}`);
  }
  return { ok: `Assegnato a ${enrollments.length} ${enrollments.length === 1 ? "iscrizione" : "iscrizioni"} (versione ${version.version}).` };
}

export async function cancelAssignment(assignmentId: string) {
  const user = await requireStaff();
  const a = await getAssignmentForStaff(user, assignmentId);
  if (a.responses.some((r) => r.status === "SUBMITTED")) return;
  await db.response.deleteMany({ where: { assignmentId } });
  await db.assignment.delete({ where: { id: assignmentId } });
  await audit(user.id, "assignment.cancel", "Assignment", assignmentId);
  revalidatePath(`/docente/allieve/${a.enrollment.studentId}`);
}

export async function extendAssignment(assignmentId: string, form: FormData) {
  const user = await requireStaff();
  const a = await getAssignmentForStaff(user, assignmentId);
  const dueAt = form.get("dueAt") ? new Date(`${form.get("dueAt")}T23:59:59`) : null;
  await db.assignment.update({
    where: { id: assignmentId },
    data: { dueAt, status: a.status === "EXPIRED" ? "SENT" : a.status },
  });
  await audit(user.id, "assignment.extend", "Assignment", assignmentId, { dueAt: dueAt?.toISOString() ?? null });
  revalidatePath(`/docente/compilazioni/${assignmentId}`);
}

export async function remindAssignment(assignmentId: string) {
  const user = await requireStaff();
  const a = await getAssignmentForStaff(user, assignmentId);
  await sendEmail(
    a.enrollment.student.email,
    `Promemoria: ${a.version.template.title}`,
    `Ciao ${a.enrollment.student.firstName},\n\nti ricordo di completare il questionario:\n${process.env.APP_URL}/allieva/questionari/${a.id}`,
  );
  await audit(user.id, "assignment.remind", "Assignment", assignmentId);
}

// ------------------------------------------------------------------ Compilazione (allieva o docente)

async function loadForRespondent(user: CurrentUser, assignmentId: string) {
  return user.role === ROLES.STUDENT ? getAssignmentForStudent(user, assignmentId) : getAssignmentForStaff(user, assignmentId);
}

function assertRespondent(user: CurrentUser, audience: string) {
  if (audience === "TEACHER" && user.role === ROLES.STUDENT) throw new Error("Non autorizzato");
  if (audience === "STUDENT" && user.role !== ROLES.STUDENT) throw new Error("Questo questionario è compilato dall’allieva");
}

/** Prima apertura: crea la risposta in bozza (tentativo corrente) e segna l'assegnazione come aperta. */
export async function openAssignment(assignmentId: string) {
  const user = await requireUser();
  const a = await loadForRespondent(user, assignmentId);
  assertRespondent(user, a.version.template.audience);
  if (a.status === "SENT") await db.assignment.update({ where: { id: a.id }, data: { status: "OPENED", openedAt: new Date() } });
  const current = a.responses[0];
  if (!current) {
    await db.response.create({ data: { assignmentId: a.id, attempt: 1, respondentId: user.id, answers: {} } });
  }
}

export async function saveAnswers(assignmentId: string, answers: Answers, submit: boolean): Promise<ActionState & { missing?: string[] }> {
  const user = await requireUser();
  const a = await loadForRespondent(user, assignmentId);
  assertRespondent(user, a.version.template.audience);
  if (effectiveStatus(a) === "EXPIRED") return { error: "Il questionario è scaduto. Contatta la tua insegnante per una proroga." };
  const current = a.responses[0];
  if (!current || current.status === "SUBMITTED") return { error: "Questionario già consegnato." };

  const content = parseContent(a.version.content);
  // Si salvano solo le chiavi che corrispondono a item esistenti
  const validIds = new Set(content.sections.flatMap((s) => s.items.map((i) => i.id)));
  const clean: Answers = Object.fromEntries(Object.entries(answers).filter(([k]) => validIds.has(k)));

  if (!submit) {
    await db.response.update({ where: { id: current.id }, data: { answers: clean as Prisma.InputJsonValue } });
    if (a.status !== "IN_PROGRESS") await db.assignment.update({ where: { id: a.id }, data: { status: "IN_PROGRESS" } });
    return { ok: "Bozza salvata." };
  }

  const missing = missingRequired(content, clean);
  if (missing.length) return { error: "Mancano alcune risposte obbligatorie.", missing: missing.map((m) => m.id) };

  const score = scoreAnswers(content, clean);
  await db.response.update({
    where: { id: current.id },
    data: {
      answers: clean as Prisma.InputJsonValue,
      status: "SUBMITTED",
      submittedAt: new Date(),
      autoScore: score.maxScore ? score.score : null,
      maxScore: score.maxScore || null,
      // Le rubriche compilate dalla docente sono già "sue": si pubblicano esplicitamente come le altre.
    },
  });
  await db.assignment.update({ where: { id: a.id }, data: { status: "COMPLETED" } });
  await audit(user.id, "response.submit", "Response", current.id);
  if (user.role === ROLES.STUDENT) {
    const teacher = await db.user.findUnique({ where: { id: a.assignedById } });
    if (teacher)
      await sendEmail(teacher.email, `Compilazione ricevuta: ${a.version.template.title}`,
        `${user.name} ha consegnato “${a.version.template.title}”.\n${process.env.APP_URL}/docente/compilazioni/${a.id}`);
  }
  revalidatePath("/allieva");
  return { ok: "Consegnato!" };
}

// ------------------------------------------------------------------ Correzione e pubblicazione (docente)

export async function reviewResponse(responseId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const r = await db.response.findUniqueOrThrow({ where: { id: responseId } });
  const a = await getAssignmentForStaff(user, r.assignmentId);
  const manualRaw = String(form.get("manualScore") ?? "").trim();
  const manualScore = manualRaw === "" ? null : Number(manualRaw.replace(",", "."));
  if (manualScore !== null && (Number.isNaN(manualScore) || manualScore < 0 || (r.maxScore && manualScore > r.maxScore)))
    return { error: "Punteggio manuale non valido." };
  const scoreNote = String(form.get("scoreNote") ?? "").trim() || null;
  if (manualScore !== null && manualScore !== r.manualScore && !scoreNote)
    return { error: "Indica il motivo della revisione del punteggio (resta tracciato)." };

  const publish = form.get("intent") === "publish";
  const unpublish = form.get("intent") === "unpublish";
  await db.response.update({
    where: { id: responseId },
    data: {
      manualScore,
      scoreNote,
      teacherFeedback: String(form.get("teacherFeedback") ?? "").trim() || null,
      ...(publish ? { published: true, publishedAt: new Date() } : {}),
      ...(unpublish ? { published: false, publishedAt: null } : {}),
    },
  });
  if (manualScore !== r.manualScore)
    await audit(user.id, "response.score.revise", "Response", responseId, { from: r.manualScore ?? r.autoScore, to: manualScore, note: scoreNote });
  if (publish) {
    await audit(user.id, "response.publish", "Response", responseId);
    await sendEmail(a.enrollment.student.email, `Il tuo feedback è disponibile`,
        `Ciao ${a.enrollment.student.firstName},\n\nla tua insegnante ha pubblicato il riscontro su “${a.version.template.title}”.\n${process.env.APP_URL}/allieva`);
  }
  revalidatePath(`/docente/compilazioni/${a.id}`);
  return { ok: publish ? "Risultato pubblicato all’allieva." : unpublish ? "Pubblicazione ritirata." : "Salvato." };
}

/** Riapre la compilazione: nuovo tentativo se consentito, altrimenti riporta la stessa risposta in bozza. */
export async function reopenResponse(assignmentId: string) {
  const user = await requireStaff();
  const a = await getAssignmentForStaff(user, assignmentId);
  const current = a.responses[0];
  if (!current || current.status !== "SUBMITTED") return;
  if (current.attempt < a.maxAttempts) {
    await db.response.create({
      data: { assignmentId, attempt: current.attempt + 1, respondentId: current.respondentId, answers: current.answers as Prisma.InputJsonValue },
    });
  } else {
    await db.response.update({ where: { id: current.id }, data: { status: "REOPENED", published: false } });
  }
  await db.assignment.update({ where: { id: assignmentId }, data: { status: "IN_PROGRESS" } });
  await audit(user.id, "response.reopen", "Assignment", assignmentId);
  revalidatePath(`/docente/compilazioni/${assignmentId}`);
}
