import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "./db";

export type EmailAttachment = { filename: string; content: string; contentType: string };

/** In produzione le email partono solo con un provider SMTP configurato (SMTP_URL). */
export const emailConfigured = () => !!process.env.SMTP_URL;

let transporter: Transporter | null = null;
const transport = () => (transporter ??= nodemailer.createTransport(process.env.SMTP_URL!));

const MAX_ATTEMPTS = 3;

/**
 * Email transazionali. Ogni invio è registrato nella tabella Notification (destinatario, oggetto, esito).
 * - SMTP_URL impostato: invio reale via SMTP con fino a 3 tentativi (es. smtps://utente:password@smtp.provider.it:465).
 * - Sviluppo senza SMTP: stampa in console e segna come inviata.
 * - Produzione senza SMTP: NON segna mai come inviata, registra l'errore (e la docente vede un avviso).
 */
export async function sendEmail(to: string, subject: string, body: string, opts: { attachments?: EmailAttachment[] } = {}) {
  const attached = opts.attachments?.length ? `\n\n[Allegati: ${opts.attachments.map((a) => a.filename).join(", ")}]` : "";
  const n = await db.notification.create({ data: { to, subject, body: body + attached } });

  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[email NON inviata: provider non configurato] → ${to} · ${subject}`);
      await db.notification.update({ where: { id: n.id }, data: { error: "Provider email non configurato (SMTP_URL)" } });
      return;
    }
    console.info(`\n[email] → ${to}\n${subject}\n${body}${attached}\n`);
    await db.notification.update({ where: { id: n.id }, data: { sentAt: new Date() } });
    return;
  }

  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await transport().sendMail({
        from: process.env.EMAIL_FROM ?? "LN Stile e Portamento <no-reply@localhost>",
        to,
        subject,
        text: body,
        attachments: opts.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
      });
      await db.notification.update({ where: { id: n.id }, data: { sentAt: new Date(), error: null } });
      return;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  console.error(`[email fallita dopo ${MAX_ATTEMPTS} tentativi] → ${to}: ${lastError}`);
  await db.notification.update({ where: { id: n.id }, data: { error: lastError.slice(0, 500) } });
}
