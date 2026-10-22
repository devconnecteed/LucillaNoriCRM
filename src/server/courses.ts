"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getStudentForStaff, requireStaff, requireUser } from "@/lib/auth";
import { getEditionForStaff } from "@/lib/guards";
import { audit } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import { parseEuro } from "@/lib/quote";
import type { ActionState } from "./students";

const opt = z.string().trim().optional().transform((v) => (v ? v : null));
const num = z.string().optional().transform((v) => (v ? Number(v) : null));

const courseTypeSchema = z.object({
  title: z.string().trim().min(1, "Titolo obbligatorio"),
  description: opt,
  category: opt,
  durationLessons: num,
  durationHours: num,
  prerequisites: opt,
  objectives: opt,
  program: opt,
  mode: z.enum(["INDIVIDUAL", "GROUP", "BOTH"]),
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function saveCourseType(id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser(ROLES.ADMIN, ROLES.TEACHER);
  const parsed = courseTypeSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const prices = { packagePriceCents: parseEuro(form.get("packagePrice") as string), lessonPriceCents: parseEuro(form.get("lessonPrice") as string) };
  for (const k of ["packagePrice", "lessonPrice"] as const)
    if (String(form.get(k) ?? "").trim() && prices[`${k}Cents`] === null) return { error: "Prezzo non valido (usa ad es. 350 o 350,00)." };
  const data = { ...parsed.data, ...prices, certificateEnabled: form.get("certificateEnabled") === "on" };
  if (id) {
    await db.courseType.update({ where: { id }, data });
  } else {
    let slug = slugify(data.title);
    if (await db.courseType.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const ct = await db.courseType.create({ data: { ...data, slug } });
    await audit(user.id, "courseType.create", "CourseType", ct.id);
    redirect("/docente/corsi");
  }
  await audit(user.id, "courseType.save", "CourseType", id);
  revalidatePath("/docente/corsi");
  return { ok: "Corso salvato." };
}

export async function setCourseTypeStatus(id: string, status: "ACTIVE" | "ARCHIVED") {
  const user = await requireStaff();
  await db.courseType.update({ where: { id }, data: { status } });
  await audit(user.id, `courseType.${status.toLowerCase()}`, "CourseType", id);
  revalidatePath("/docente/corsi");
}

export async function createEdition(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const courseTypeId = String(form.get("courseTypeId") ?? "");
  const ct = await db.courseType.findUnique({ where: { id: courseTypeId } });
  if (!ct || ct.status !== "ACTIVE") return { error: "Seleziona una tipologia di corso attiva." };
  const lessons = Math.min(50, Math.max(0, Number(form.get("lessons") || ct.durationLessons || 0)));
  const duration = Math.max(15, Number(form.get("durationMin") || 60));
  const start = form.get("startDate") ? new Date(String(form.get("startDate"))) : null;
  const edition = await db.courseEdition.create({
    data: {
      courseTypeId,
      teacherId: user.role === ROLES.ADMIN && form.get("teacherId") ? String(form.get("teacherId")) : user.id,
      title: String(form.get("title") || ct.title).trim(),
      startDate: start,
      minAttendancePct: Math.min(100, Math.max(0, Number(form.get("minAttendancePct") || 80))),
      lessons: {
        create: Array.from({ length: lessons }, (_, i) => ({
          number: i + 1,
          durationMin: duration,
          date: start ? new Date(start.getTime() + i * 7 * 86400_000) : null,
        })),
      },
    },
  });
  await audit(user.id, "edition.create", "CourseEdition", edition.id);
  redirect(`/docente/corsi/${edition.id}`);
}

export async function updateEdition(editionId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  await getEditionForStaff(user, editionId);
  const status = String(form.get("status"));
  if (!["PLANNED", "RUNNING", "COMPLETED", "CANCELLED"].includes(status)) return { error: "Stato non valido" };
  await db.courseEdition.update({
    where: { id: editionId },
    data: {
      title: String(form.get("title") ?? "").trim() || undefined,
      status,
      startDate: form.get("startDate") ? new Date(String(form.get("startDate"))) : null,
      endDate: form.get("endDate") ? new Date(String(form.get("endDate"))) : null,
      minAttendancePct: Math.min(100, Math.max(0, Number(form.get("minAttendancePct") || 80))),
    },
  });
  await audit(user.id, "edition.update", "CourseEdition", editionId, { status });
  revalidatePath(`/docente/corsi/${editionId}`);
  return { ok: "Edizione salvata." };
}

export async function addLesson(editionId: string) {
  const user = await requireStaff();
  await getEditionForStaff(user, editionId);
  const last = await db.lesson.findFirst({ where: { editionId }, orderBy: { number: "desc" } });
  await db.lesson.create({ data: { editionId, number: (last?.number ?? 0) + 1, durationMin: last?.durationMin ?? 60 } });
  revalidatePath(`/docente/corsi/${editionId}`);
}

export async function updateLesson(lessonId: string, form: FormData) {
  const user = await requireStaff();
  const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  await getEditionForStaff(user, lesson.editionId);
  await db.lesson.update({
    where: { id: lessonId },
    data: {
      // datetime-local ("2026-10-26T10:30") viene interpretato nell'ora locale del server
      date: form.get("date") ? new Date(String(form.get("date"))) : null,
      topic: String(form.get("topic") ?? "").trim() || null,
      durationMin: Math.max(0, Number(form.get("durationMin") || lesson.durationMin)),
    },
  });
  revalidatePath(`/docente/corsi/${lesson.editionId}`);
}

/** Iscrizione: il form contiene editionId e studentId (usato da dossier allieva e pagina edizione). */
export async function enrollStudent(form: FormData) {
  const user = await requireStaff();
  const editionId = String(form.get("editionId") ?? "");
  await getEditionForStaff(user, editionId);
  const studentId = String(form.get("studentId") ?? "");
  await getStudentForStaff(user, studentId);
  await db.enrollment.upsert({
    where: { studentId_editionId: { studentId, editionId } },
    update: {},
    create: { studentId, editionId },
  });
  await audit(user.id, "enrollment.create", "CourseEdition", editionId, { studentId });
  revalidatePath(`/docente/corsi/${editionId}`);
  revalidatePath(`/docente/allieve/${studentId}`);
}

export async function setEnrollmentStatus(enrollmentId: string, form: FormData) {
  const user = await requireStaff();
  const status = String(form.get("status"));
  if (!["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "INTERRUPTED"].includes(status)) return;
  const e = await db.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } });
  await getEditionForStaff(user, e.editionId);
  await db.enrollment.update({ where: { id: enrollmentId }, data: { status } });
  await audit(user.id, "enrollment.status", "Enrollment", enrollmentId, { status });
  revalidatePath(`/docente/corsi/${e.editionId}`);
}

/** Registro presenze di una lezione: un checkbox per iscrizione (name = present.<enrollmentId>). */
export async function saveAttendance(lessonId: string, form: FormData) {
  const user = await requireStaff();
  const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { edition: { include: { enrollments: true } } } });
  await getEditionForStaff(user, lesson.editionId);
  for (const en of lesson.edition.enrollments) {
    const present = form.get(`present.${en.id}`) === "on";
    await db.attendance.upsert({
      where: { lessonId_enrollmentId: { lessonId, enrollmentId: en.id } },
      update: { present },
      create: { lessonId, enrollmentId: en.id, present },
    });
    if (present && en.status === "NOT_STARTED")
      await db.enrollment.update({ where: { id: en.id }, data: { status: "IN_PROGRESS" } });
  }
  await audit(user.id, "attendance.save", "Lesson", lessonId);
  revalidatePath(`/docente/corsi/${lesson.editionId}`);
}
