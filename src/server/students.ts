"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createInvite, getStudentForStaff, requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/notify";
import { CONSENT_LABELS, INVITE_TTL_DAYS, ROLES } from "@/lib/constants";

export type ActionState = { error?: string; ok?: string; link?: string } | undefined;

const opt = z.string().trim().optional().transform((v) => (v ? v : null));
const studentSchema = z.object({
  firstName: z.string().trim().min(1, "Nome obbligatorio"),
  lastName: z.string().trim().min(1, "Cognome obbligatorio"),
  email: z.string().trim().toLowerCase().email("Email non valida"),
  phone: opt,
  birthDate: opt,
  address: opt,
  emergencyContact: opt,
  goals: opt,
  experience: opt,
  preferences: opt,
  leadSource: opt,
  adminNotes: opt,
  physicalNotes: opt,
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
  isMinor: z.boolean(),
  guardianName: opt,
  guardianEmail: opt,
  guardianPhone: opt,
});

const BRIDAL_KEYS = ["weddingDate", "venue", "ceremonyType", "song", "dressStyle", "train", "veil", "heels", "bouquet"] as const;

function readStudent(form: FormData) {
  const raw = Object.fromEntries(form.entries());
  const parsed = studentSchema.safeParse({ ...raw, isMinor: form.get("isMinor") === "on" });
  const bridal = Object.fromEntries(
    BRIDAL_KEYS.map((k) => [k, String(form.get(`bridal.${k}`) ?? "").trim()]).filter(([, v]) => v),
  );
  return { parsed, bridal: Object.keys(bridal).length ? bridal : null };
}

export async function createStudent(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const { parsed, bridal } = readStudent(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.isMinor && !d.guardianName) return { error: "Per un’allieva minorenne indica il genitore/tutore." };

  // Controllo duplicati email/telefono (spec §3)
  if (form.get("confirmDuplicate") !== "on") {
    const dup = await db.student.findFirst({
      where: { OR: [{ email: d.email }, ...(d.phone ? [{ phone: d.phone }] : [])] },
    });
    if (dup)
      return { error: `Esiste già un’anagrafica con questa email o telefono (${dup.firstName} ${dup.lastName}). Spunta “Crea comunque” per procedere.` };
  }

  const student = await db.student.create({
    data: {
      ...d,
      birthDate: d.birthDate ? new Date(d.birthDate) : null,
      bridalInfo: bridal ?? undefined,
      teacherId: user.role === ROLES.ADMIN && form.get("teacherId") ? String(form.get("teacherId")) : user.id,
    },
  });
  for (const type of Object.keys(CONSENT_LABELS)) {
    if (form.get(`consent.${type}`) === "on")
      await db.consentRecord.create({ data: { studentId: student.id, type, granted: true, recordedById: user.id } });
  }
  await audit(user.id, "student.create", "Student", student.id);
  redirect(`/docente/allieve/${student.id}?creata=1`);
}

export async function updateStudent(studentId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  await getStudentForStaff(user, studentId);
  const { parsed, bridal } = readStudent(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  await db.student.update({
    where: { id: studentId },
    data: { ...d, birthDate: d.birthDate ? new Date(d.birthDate) : null, bridalInfo: bridal ?? undefined },
  });
  // Cambio email: si riflette sull'account (se non usata da altri)
  const s = await db.student.findUniqueOrThrow({ where: { id: studentId } });
  if (s.userId) {
    const clash = await db.user.findFirst({ where: { email: d.email, NOT: { id: s.userId } } });
    if (clash) return { error: "Dati salvati, ma l’email è già usata da un altro account: accesso non aggiornato." };
    await db.user.update({ where: { id: s.userId }, data: { email: d.email, name: `${d.firstName} ${d.lastName}` } });
  }
  await audit(user.id, "student.update", "Student", studentId);
  revalidatePath(`/docente/allieve/${studentId}`);
  return { ok: "Anagrafica salvata." };
}

/** Crea l'account (se manca) e invia un invito monouso. In sviluppo il link è mostrato alla docente. */
export async function inviteStudent(studentId: string, _: ActionState): Promise<ActionState> {
  const user = await requireStaff();
  const student = await getStudentForStaff(user, studentId);
  let userId = student.userId;
  if (!userId) {
    const existing = await db.user.findUnique({ where: { email: student.email } });
    if (existing) return { error: "Questa email è già associata a un altro account." };
    const u = await db.user.create({
      data: { email: student.email, name: `${student.firstName} ${student.lastName}`, role: ROLES.STUDENT },
    });
    await db.student.update({ where: { id: studentId }, data: { userId: u.id } });
    userId = u.id;
  } else {
    await db.user.update({ where: { id: userId }, data: { active: true } });
  }
  const link = await createInvite(userId);
  const to = student.isMinor && student.guardianEmail ? student.guardianEmail : student.email;
  await sendEmail(
    to,
    "Il tuo accesso all’area riservata LN Stile e Portamento",
    `Ciao ${student.firstName},\n\nper attivare il tuo accesso apri questo link (valido ${INVITE_TTL_DAYS} giorni):\n${link}\n\nA presto!`,
  );
  await audit(user.id, "student.invite", "Student", studentId);
  revalidatePath(`/docente/allieve/${studentId}`);
  return { ok: `Invito inviato a ${to}.`, link: process.env.NODE_ENV !== "production" ? link : undefined };
}

export async function revokeAccess(studentId: string) {
  const user = await requireStaff();
  const student = await getStudentForStaff(user, studentId);
  if (student.userId) {
    await db.user.update({ where: { id: student.userId }, data: { active: false } });
    await db.invite.updateMany({ where: { userId: student.userId, usedAt: null }, data: { expiresAt: new Date() } });
  }
  await audit(user.id, "student.revokeAccess", "Student", studentId);
  revalidatePath(`/docente/allieve/${studentId}`);
}

export async function addTeacherNote(studentId: string, form: FormData) {
  const user = await requireStaff();
  await getStudentForStaff(user, studentId);
  const text = String(form.get("text") ?? "").trim();
  if (!text) return;
  await db.teacherNote.create({ data: { studentId, authorId: user.id, text } });
  revalidatePath(`/docente/allieve/${studentId}`);
}

export async function recordConsent(studentId: string, form: FormData) {
  const user = await requireStaff();
  await getStudentForStaff(user, studentId);
  const type = String(form.get("type"));
  if (!(type in CONSENT_LABELS)) return;
  const granted = form.get("granted") === "true";
  await db.consentRecord.create({ data: { studentId, type, granted, recordedById: user.id } });
  // Revoca consenso dati fisici → cancellazione del dato (minimizzazione)
  if (type === "PHYSICAL_DATA" && !granted) await db.student.update({ where: { id: studentId }, data: { physicalNotes: null } });
  await audit(user.id, granted ? "consent.grant" : "consent.revoke", "Student", studentId, { type });
  revalidatePath(`/docente/allieve/${studentId}`);
}
