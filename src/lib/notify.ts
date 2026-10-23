import { db } from "./db";

export type EmailAttachment = { filename: string; content: string; contentType: string };

/**
 * Email transazionali. In MVP la notifica viene sempre registrata (tabella Notification);
 * senza SMTP configurato viene stampata in console. L'invio reale con retry va collegato
 * a un provider (es. SMTP/Postmark) prima della messa in produzione: gli allegati (es. inviti
 * calendario .ics) sono già pronti per essere passati al provider.
 */
export async function sendEmail(to: string, subject: string, body: string, opts: { attachments?: EmailAttachment[] } = {}) {
  const attached = opts.attachments?.length ? `\n\n[Allegati: ${opts.attachments.map((a) => a.filename).join(", ")}]` : "";
  const n = await db.notification.create({ data: { to, subject, body: body + attached } });
  if (!process.env.SMTP_URL) {
    console.info(`\n[email] → ${to}\n${subject}\n${body}${attached}\n`);
    await db.notification.update({ where: { id: n.id }, data: { sentAt: new Date() } });
    return;
  }
  // TODO: integrazione provider email con retry (inviare anche opts.attachments).
  await db.notification.update({ where: { id: n.id }, data: { error: "Provider SMTP non ancora integrato" } });
}
