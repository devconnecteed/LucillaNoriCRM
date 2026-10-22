"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, hashToken, homeFor, startSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export type FormState = { error?: string; ok?: string } | undefined;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  // Stesso messaggio in tutti i casi per non rivelare quali email esistono.
  if (!user || !user.active || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash)))
    return { error: "Email o password non corretti." };
  await startSession(user.id, user.role);
  await audit(user.id, "login", "User", user.id);
  redirect(homeFor(user.role));
}

export async function logout() {
  await endSession();
  redirect("/login");
}

const passwordSchema = z
  .string()
  .min(10, "La password deve avere almeno 10 caratteri.")
  .regex(/[A-Za-z]/, "Inserisci almeno una lettera.")
  .regex(/[0-9]/, "Inserisci almeno un numero.");

export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("confirm") ?? "")) return { error: "Le due password non coincidono." };
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const invite = await db.invite.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date() || !invite.user.active)
    return { error: "Invito non valido o scaduto. Chiedi alla tua insegnante di inviartene uno nuovo." };

  await db.$transaction([
    db.user.update({ where: { id: invite.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    db.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
  ]);
  await audit(invite.userId, "invite.accepted", "User", invite.userId);
  await startSession(invite.userId, invite.user.role);
  redirect(homeFor(invite.user.role));
}
