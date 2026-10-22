"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { contentSchema } from "@/lib/questionnaire/schema";
import type { QuestionnaireContent } from "@/lib/questionnaire/types";
import type { ActionState } from "./students";

// Versioning (spec §5): le versioni PUBLISHED non si modificano mai. Ogni modifica avviene su una
// versione DRAFT, che alla pubblicazione diventa la nuova versione assegnabile.

const EMPTY: QuestionnaireContent = {
  sections: [{ id: "s1", title: "Sezione 1", items: [] }],
};

export async function createTemplate(form: FormData) {
  const user = await requireStaff();
  const tpl = await db.questionnaireTemplate.create({
    data: {
      title: String(form.get("title") || "Nuovo questionario").trim(),
      phase: String(form.get("phase") || "LESSON"),
      audience: form.get("audience") === "TEACHER" ? "TEACHER" : "STUDENT",
      courseTypeId: String(form.get("courseTypeId") || "") || null,
      versions: { create: { version: 1, content: EMPTY, authorId: user.id } },
    },
  });
  await audit(user.id, "template.create", "QuestionnaireTemplate", tpl.id);
  redirect(`/docente/questionari/${tpl.id}`);
}

export async function duplicateTemplate(templateId: string) {
  const user = await requireStaff();
  const src = await db.questionnaireTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const copy = await db.questionnaireTemplate.create({
    data: {
      title: `${src.title} (copia)`,
      description: src.description,
      phase: src.phase,
      audience: src.audience,
      courseTypeId: src.courseTypeId,
      sourceFile: src.sourceFile,
      versions: { create: { version: 1, content: src.versions[0]?.content ?? EMPTY, authorId: user.id } },
    },
  });
  await audit(user.id, "template.duplicate", "QuestionnaireTemplate", copy.id, { from: templateId });
  redirect(`/docente/questionari/${copy.id}`);
}

/** Apre una bozza a partire dall'ultima versione (se non ce n'è già una). */
export async function startDraft(templateId: string) {
  const user = await requireStaff();
  const versions = await db.templateVersion.findMany({ where: { templateId }, orderBy: { version: "desc" } });
  if (!versions.some((v) => v.status === "DRAFT")) {
    await db.templateVersion.create({
      data: { templateId, version: (versions[0]?.version ?? 0) + 1, content: versions[0]?.content ?? EMPTY, authorId: user.id },
    });
  }
  revalidatePath(`/docente/questionari/${templateId}`);
}

export async function saveDraft(versionId: string, content: unknown): Promise<ActionState> {
  const user = await requireStaff();
  const v = await db.templateVersion.findUniqueOrThrow({ where: { id: versionId } });
  if (v.status !== "DRAFT") return { error: "Questa versione è già pubblicata e non può essere modificata." };
  const parsed = contentSchema.safeParse(content);
  if (!parsed.success) return { error: `Struttura non valida: ${parsed.error.issues[0].path.join(".")} – ${parsed.error.issues[0].message}` };
  await db.templateVersion.update({ where: { id: versionId }, data: { content: parsed.data, authorId: user.id } });
  return { ok: "Bozza salvata." };
}

export async function publishVersion(versionId: string, content: unknown): Promise<ActionState> {
  const saved = await saveDraft(versionId, content);
  if (saved?.error) return saved;
  const user = await requireStaff();
  const parsed = contentSchema.parse(content);
  if (!parsed.sections.some((s) => s.items.length)) return { error: "Aggiungi almeno una domanda prima di pubblicare." };
  const v = await db.templateVersion.update({
    where: { id: versionId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await db.questionnaireTemplate.update({ where: { id: v.templateId }, data: { status: "PUBLISHED" } });
  await audit(user.id, "template.publish", "TemplateVersion", versionId, { version: v.version });
  revalidatePath(`/docente/questionari/${v.templateId}`);
  return { ok: `Versione ${v.version} pubblicata.` };
}

export async function discardDraft(versionId: string) {
  const user = await requireStaff();
  const v = await db.templateVersion.findUniqueOrThrow({ where: { id: versionId } });
  if (v.status !== "DRAFT") return;
  const count = await db.templateVersion.count({ where: { templateId: v.templateId } });
  if (count === 1) return; // un modello senza versioni non ha senso: si archivia invece
  await db.templateVersion.delete({ where: { id: versionId } });
  await audit(user.id, "template.discardDraft", "TemplateVersion", versionId);
  revalidatePath(`/docente/questionari/${v.templateId}`);
}

export async function updateTemplateMeta(templateId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "Titolo obbligatorio." };
  await db.questionnaireTemplate.update({
    where: { id: templateId },
    data: {
      title,
      description: String(form.get("description") ?? "").trim() || null,
      phase: String(form.get("phase")),
      audience: form.get("audience") === "TEACHER" ? "TEACHER" : "STUDENT",
      courseTypeId: String(form.get("courseTypeId") || "") || null,
    },
  });
  await audit(user.id, "template.meta", "QuestionnaireTemplate", templateId);
  revalidatePath(`/docente/questionari/${templateId}`);
  return { ok: "Dati salvati." };
}

export async function setTemplateArchived(templateId: string, archived: boolean) {
  const user = await requireStaff();
  const hasPublished = await db.templateVersion.count({ where: { templateId, status: "PUBLISHED" } });
  await db.questionnaireTemplate.update({
    where: { id: templateId },
    data: { status: archived ? "ARCHIVED" : hasPublished ? "PUBLISHED" : "DRAFT" },
  });
  await audit(user.id, archived ? "template.archive" : "template.restore", "QuestionnaireTemplate", templateId);
  revalidatePath(`/docente/questionari/${templateId}`);
  revalidatePath("/docente/questionari");
}
