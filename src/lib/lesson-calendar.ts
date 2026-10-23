import "server-only";
import type { Lesson, CourseEdition, CourseType, User } from "@prisma/client";
import { db } from "./db";
import { buildCalendar, googleCalendarUrl, type CalendarEvent } from "./ics";
import { sign } from "./signing";
import { sendEmail } from "./notify";

type LessonFull = Lesson & { edition: CourseEdition & { courseType: CourseType; teacher: User } };

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export function lessonEvent(l: LessonFull): CalendarEvent | null {
  if (!l.date) return null;
  const title = `LN · ${l.edition.courseType.title} – lezione ${l.number}`;
  return {
    uid: `lesson-${l.id}@ln-studio`,
    start: l.date,
    end: new Date(l.date.getTime() + l.durationMin * 60_000),
    title,
    description: [l.topic, `Percorso: ${l.edition.title}`, `Docente: ${l.edition.teacher.name}`].filter(Boolean).join("\n"),
    location: l.location,
    sequence: l.sequence,
    cancelled: l.edition.status === "CANCELLED",
  };
}

/** Link "Apple / Outlook" (.ics firmato, apribile senza login) e "Google Calendar" di una lezione. */
export function lessonCalendarLinks(l: LessonFull) {
  const e = lessonEvent(l);
  if (!e) return null;
  return {
    ics: `${appUrl()}/api/calendario/lezione/${l.id}.ics?sig=${sign("lesson", l.id)}`,
    google: googleCalendarUrl(e),
  };
}

/** Calendario personale in abbonamento (si aggiorna da solo in Apple/Google Calendar). */
export function feedUrls(userId: string) {
  const https = `${appUrl()}/api/calendario/feed/${userId}.ics?sig=${sign("feed", userId)}`;
  return { https, webcal: https.replace(/^https?:/, "webcal:") };
}

export async function loadLesson(lessonId: string) {
  return db.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { edition: { include: { courseType: true, teacher: true } } } });
}

const when = (d: Date) =>
  new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

/**
 * Avvisa tutte le persone coinvolte (docente e allieve iscritte; tutore se minorenne) di una lezione
 * pianificata o spostata, con invito calendario .ics allegato e link per Google/Apple.
 */
export async function notifyLessonScheduled(lessonId: string, kind: "nuova" | "spostata") {
  const l = await loadLesson(lessonId);
  const event = lessonEvent(l);
  const links = lessonCalendarLinks(l);
  if (!event || !links) return { sent: 0 };

  const enrollments = await db.enrollment.findMany({
    where: { editionId: l.editionId, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
    include: { student: true },
  });
  const ics = buildCalendar([event]);
  const attachment = { filename: `lezione-${l.number}.ics`, content: ics, contentType: "text/calendar; charset=utf-8; method=PUBLISH" };
  const subject = kind === "nuova"
    ? `Lezione ${l.number} · ${l.edition.courseType.title}: ${when(l.date!)}`
    : `Lezione spostata · ${l.edition.courseType.title}: ora ${when(l.date!)}`;
  const details = [
    `${kind === "nuova" ? "Nuova lezione in calendario" : "La lezione è stata spostata"}:`,
    "",
    `Quando: ${when(l.date!)} (${l.durationMin} minuti)`,
    l.topic ? `Argomento: ${l.topic}` : null,
    l.location ? `Dove: ${l.location}` : null,
    "",
    "Aggiungi al tuo calendario:",
    `• Google Calendar: ${links.google}`,
    `• Apple Calendar / Outlook: ${links.ics}`,
    "(trovi anche l’invito in allegato)",
  ].filter((x) => x !== null).join("\n");

  const recipients = new Map<string, string>(); // email → saluto
  recipients.set(l.edition.teacher.email, l.edition.teacher.name.split(" ")[0]);
  for (const en of enrollments) {
    const s = en.student;
    recipients.set(s.isMinor && s.guardianEmail ? s.guardianEmail : s.email, s.isMinor && s.guardianName ? s.guardianName : s.firstName);
  }
  const students = enrollments.map((e) => `${e.student.firstName} ${e.student.lastName}`).join(", ");

  for (const [to, name] of recipients) {
    const isTeacher = to === l.edition.teacher.email;
    const body = `Ciao ${name},\n\n${details}${isTeacher && students ? `\n\nAllieve: ${students}` : ""}\n\nA presto!\nLN Stile e Portamento`;
    await sendEmail(to, subject, body, { attachments: [attachment] });
  }
  await db.lesson.update({ where: { id: lessonId }, data: { notifiedAt: new Date() } });
  return { sent: recipients.size };
}
