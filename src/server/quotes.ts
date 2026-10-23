"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashToken, requireStaff, studentScope, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/notify";
import { ROLES } from "@/lib/constants";
import { computeQuote, euro, quoteEffectiveStatus } from "@/lib/quote";
import type { ActionState } from "./students";

const lineSchema = z.object({
  label: z.string().trim().min(1, "Ogni riga deve avere una descrizione"),
  qty: z.number().positive("Quantità non valida").max(1000),
  unitCents: z.number().int().min(0).max(10_000_000),
});

const quoteSchema = z.object({
  courseTypeId: z.string().min(1, "Scegli il corso"),
  prospectFirstName: z.string().trim().min(1, "Nome obbligatorio"),
  prospectLastName: z.string().trim().min(1, "Cognome obbligatorio"),
  prospectEmail: z.string().trim().toLowerCase().email("Email non valida"),
  prospectPhone: z.string().trim().optional().transform((v) => v || null),
  lessons: z.coerce.number().int().min(1, "Almeno una lezione").max(100),
  lessonMinutes: z.coerce.number().int().min(15).max(480),
  discountPct: z.coerce.number().min(0).max(100),
  vatRate: z.coerce.number().min(0).max(100),
  validUntil: z.string().min(1, "Indica la validità").transform((v) => new Date(`${v}T12:00:00`)),
  notes: z.string().trim().optional().transform((v) => v || null),
});

function quoteScope(user: CurrentUser) {
  return user.role === ROLES.ADMIN ? {} : { teacherId: user.id };
}

async function getQuoteForStaff(user: CurrentUser, id: string) {
  const q = await db.quote.findFirst({ where: { id, ...quoteScope(user) }, include: { courseType: true } });
  if (!q) notFound();
  return q;
}

async function nextQuoteNumber() {
  const year = new Date().getFullYear();
  const count = await db.quote.count({ where: { number: { startsWith: `PREV-${year}-` } } });
  return `PREV-${year}-${String(count + 1).padStart(4, "0")}`;
}

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

// ------------------------------------------------------------------ Docente

export async function saveQuote(id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = quoteSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let lines;
  try {
    lines = z.array(lineSchema).min(1, "Aggiungi almeno una voce").parse(JSON.parse(String(form.get("lines") ?? "[]")));
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.issues[0].message : "Voci del preventivo non valide" };
  }
  const d = parsed.data;
  const course = await db.courseType.findFirst({ where: { id: d.courseTypeId, status: "ACTIVE" } });
  if (!course) return { error: "Corso non disponibile" };

  // Allieva già in anagrafica (facoltativa)
  const studentId = String(form.get("studentId") || "") || null;
  if (studentId && !(await db.student.findFirst({ where: { id: studentId, ...studentScope(user) } })))
    return { error: "Allieva non accessibile" };

  const totals = computeQuote({ lines, discountPct: d.discountPct, vatRate: d.vatRate });
  const data = { ...d, ...totals, lines, studentId };

  let quoteId = id;
  if (id) {
    const q = await getQuoteForStaff(user, id);
    if (q.status !== "DRAFT") return { error: "Un preventivo già inviato non si modifica: annullalo e creane uno nuovo." };
    await db.quote.update({ where: { id }, data });
  } else {
    const q = await db.quote.create({ data: { ...data, number: await nextQuoteNumber(), teacherId: user.id } });
    quoteId = q.id;
  }
  await audit(user.id, id ? "quote.update" : "quote.create", "Quote", quoteId);
  redirect(`/docente/corsi/preventivi/${quoteId}`);
}

/** Invia (o reinvia) il preventivo con un nuovo link monouso; il link precedente smette di funzionare. */
export async function sendQuote(id: string, _?: ActionState): Promise<ActionState> {
  const user = await requireStaff();
  const q = await getQuoteForStaff(user, id);
  if (!["DRAFT", "SENT"].includes(q.status)) return { error: "Questo preventivo non può essere inviato." };
  if (quoteEffectiveStatus({ ...q, status: "SENT" }) === "EXPIRED") return { error: "La validità è già scaduta: aggiornala prima di inviare." };
  if (q.totalCents <= 0) return { error: "Il totale è 0 €: imposta i prezzi (listino del corso o voci del preventivo) prima di inviarlo." };

  const token = randomBytes(32).toString("base64url");
  await db.quote.update({ where: { id }, data: { status: "SENT", tokenHash: hashToken(token), sentAt: new Date() } });
  const link = `${appUrl()}/preventivo/${token}`;
  await sendEmail(
    q.prospectEmail,
    `Il tuo preventivo LN Stile e Portamento – ${q.courseType.title}`,
    `Ciao ${q.prospectFirstName},\n\ncome d’accordo ti invio il preventivo ${q.number} per il percorso “${q.courseType.title}” (${q.lessons} lezioni).\n` +
      `Totale: ${euro(q.totalCents)}\nValido fino al ${q.validUntil.toLocaleDateString("it-IT")}.\n\n` +
      `Puoi consultarlo e accettarlo da qui:\n${link}\n\nPer qualsiasi domanda rispondi pure a questa email.\n\nA presto!\n${user.name}`,
  );
  await audit(user.id, "quote.send", "Quote", id);
  revalidatePath(`/docente/corsi/preventivi/${id}`);
  return { ok: `Preventivo inviato a ${q.prospectEmail}.`, link: process.env.NODE_ENV !== "production" ? link : undefined };
}

export async function cancelQuote(id: string) {
  const user = await requireStaff();
  const q = await getQuoteForStaff(user, id);
  if (!["DRAFT", "SENT"].includes(q.status)) return;
  await db.quote.update({ where: { id }, data: { status: "CANCELLED", tokenHash: null } });
  await audit(user.id, "quote.cancel", "Quote", id);
  revalidatePath(`/docente/corsi/preventivi/${id}`);
}

/** Preventivo accettato → crea l'edizione individuale con le lezioni previste e iscrive l'allieva. */
export async function convertQuote(id: string) {
  const user = await requireStaff();
  const q = await getQuoteForStaff(user, id);
  if (q.status !== "ACCEPTED" || !q.studentId) return;
  if (q.editionId) redirect(`/docente/corsi/${q.editionId}`);
  const edition = await db.courseEdition.create({
    data: {
      courseTypeId: q.courseTypeId,
      teacherId: q.teacherId,
      title: `${q.courseType.title} · ${q.prospectFirstName} ${q.prospectLastName}`,
      status: "PLANNED",
      lessons: { create: Array.from({ length: q.lessons }, (_, i) => ({ number: i + 1, durationMin: q.lessonMinutes })) },
      enrollments: { create: { studentId: q.studentId } },
    },
  });
  await db.quote.update({ where: { id }, data: { editionId: edition.id } });
  await audit(user.id, "quote.convert", "Quote", id, { editionId: edition.id });
  redirect(`/docente/corsi/${edition.id}`);
}

// ------------------------------------------------------------------ Pubblico (link email)
// Dopo accettazione/rifiuto il token resta: il link mostra l'esito in sola lettura (solo SENT è modificabile).

async function getOpenQuoteByToken(token: string) {
  const q = await db.quote.findUnique({ where: { tokenHash: hashToken(token) }, include: { courseType: true, teacher: true } });
  if (!q || q.status !== "SENT" || quoteEffectiveStatus(q) === "EXPIRED") return null;
  return q;
}

export async function acceptQuote(token: string, _: ActionState, form: FormData): Promise<ActionState> {
  const q = await getOpenQuoteByToken(token);
  if (!q) return { error: "Questo preventivo non è più accettabile (già gestito, annullato o scaduto)." };
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 3) return { error: "Scrivi il tuo nome e cognome per confermare." };
  if (form.get("accept") !== "on") return { error: "Per accettare spunta la conferma del preventivo." };
  if (form.get("privacy") !== "on") return { error: "Per procedere è necessario prendere visione dell’informativa privacy." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? null;

  // Collega l'anagrafica esistente della stessa docente, altrimenti la crea
  let studentId = q.studentId;
  if (!studentId) {
    const existing = await db.student.findFirst({ where: { email: q.prospectEmail, teacherId: q.teacherId } });
    studentId =
      existing?.id ??
      (
        await db.student.create({
          data: {
            teacherId: q.teacherId,
            firstName: q.prospectFirstName,
            lastName: q.prospectLastName,
            email: q.prospectEmail,
            phone: q.prospectPhone,
            leadSource: `Preventivo ${q.number}`,
          },
        })
      ).id;
  }
  await db.consentRecord.create({ data: { studentId, type: "PRIVACY", granted: true, recordedById: q.teacherId } });
  await db.quote.update({
    where: { id: q.id },
    data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedName: name, acceptedIp: ip, studentId },
  });
  await audit(null, "quote.accept", "Quote", q.id, { name, ip });
  revalidatePath(`/preventivo/${token}`);

  await sendEmail(q.teacher.email, `Preventivo ${q.number} accettato`,
    `${name} ha accettato il preventivo ${q.number} (${q.courseType.title}, ${euro(q.totalCents)}).\nAvvia il percorso: ${appUrl()}/docente/corsi/preventivi/${q.id}`);
  await sendEmail(q.prospectEmail, `Conferma: preventivo ${q.number} accettato`,
    `Ciao ${q.prospectFirstName},\n\ngrazie! Abbiamo registrato l’accettazione del preventivo ${q.number} per “${q.courseType.title}”.\nTi contatterò a breve per fissare le lezioni e ti invierò l’accesso alla tua area riservata.\n\n${q.teacher.name}`);
  return { ok: "accepted" };
}

export async function declineQuote(token: string, _: ActionState, form: FormData): Promise<ActionState> {
  const q = await getOpenQuoteByToken(token);
  if (!q) return { error: "Questo preventivo non è più disponibile." };
  const reason = String(form.get("reason") ?? "").trim().slice(0, 1000) || null;
  await db.quote.update({ where: { id: q.id }, data: { status: "DECLINED", declinedAt: new Date(), declineReason: reason } });
  await audit(null, "quote.decline", "Quote", q.id);
  revalidatePath(`/preventivo/${token}`);
  await sendEmail(q.teacher.email, `Preventivo ${q.number} rifiutato`,
    `${q.prospectFirstName} ${q.prospectLastName} ha rifiutato il preventivo ${q.number}.${reason ? `\nMotivo: ${reason}` : ""}`);
  return { ok: "declined" };
}
