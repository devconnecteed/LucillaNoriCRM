import { db } from "./db";

/**
 * Email transazionali. In MVP la notifica viene sempre registrata (tabella Notification);
 * senza SMTP configurato viene stampata in console. L'invio reale con retry va collegato
 * a un provider (es. SMTP/Postmark) prima della messa in produzione.
 */
export async function sendEmail(to: string, subject: string, body: string) {
  const n = await db.notification.create({ data: { to, subject, body } });
  if (!process.env.SMTP_URL) {
    console.info(`\n[email] → ${to}\n${subject}\n${body}\n`);
    await db.notification.update({ where: { id: n.id }, data: { sentAt: new Date() } });
    return;
  }
  // TODO: integrazione provider email con retry.
  await db.notification.update({ where: { id: n.id }, data: { error: "Provider SMTP non ancora integrato" } });
}
