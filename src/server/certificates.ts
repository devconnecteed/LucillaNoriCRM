"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getEnrollmentForStaff } from "@/lib/guards";
import { certificateRequirements, nextCertificateNumber } from "@/lib/certificates";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/notify";
import type { ActionState } from "./students";

export async function issueCertificate(enrollmentId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  await getEnrollmentForStaff(user, enrollmentId);
  const req = await certificateRequirements(enrollmentId);
  if (req.active) return { error: `Esiste già un attestato valido (${req.active.number}). Annullalo per riemetterlo.` };
  const overrideReason = String(form.get("overrideReason") ?? "").trim() || null;
  if (!req.ok && !overrideReason)
    return { error: "Requisiti non soddisfatti: per emettere comunque l’attestato indica la motivazione (resta tracciata)." };
  if (form.get("confirm") !== "on") return { error: "Conferma i dati dell’attestato prima di emetterlo." };

  const en = req.enrollment;
  const cert = await db.certificate.create({
    data: {
      number: await nextCertificateNumber(),
      enrollmentId,
      courseTitle: en.edition.courseType.title,
      studentName: `${en.student.firstName} ${en.student.lastName}`,
      periodFrom: req.periodFrom,
      periodTo: req.periodTo,
      hours: req.hours || null,
      issuedById: user.id,
      overrideReason: req.ok ? null : overrideReason,
    },
  });
  await audit(user.id, req.ok ? "certificate.issue" : "certificate.issue.override", "Certificate", cert.id, { overrideReason });
  await sendEmail(en.student.email, "Il tuo attestato di partecipazione è disponibile",
    `Ciao ${en.student.firstName},\n\nil tuo attestato per “${cert.courseTitle}” è disponibile nella tua area riservata:\n${process.env.APP_URL}/allieva`);
  revalidatePath("/docente/attestati");
  return { ok: `Attestato ${cert.number} emesso.` };
}

export async function revokeCertificate(certificateId: string, form: FormData) {
  const user = await requireStaff();
  const cert = await db.certificate.findUniqueOrThrow({ where: { id: certificateId } });
  await getEnrollmentForStaff(user, cert.enrollmentId);
  const reason = String(form.get("reason") ?? "").trim();
  if (!reason || cert.revokedAt) return;
  await db.certificate.update({ where: { id: certificateId }, data: { revokedAt: new Date(), revokeReason: reason } });
  await audit(user.id, "certificate.revoke", "Certificate", certificateId, { reason });
  revalidatePath("/docente/attestati");
}
