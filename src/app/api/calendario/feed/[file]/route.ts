import { db } from "@/lib/db";
import { verify } from "@/lib/signing";
import { buildCalendar, type CalendarEvent } from "@/lib/ics";
import { lessonEvent } from "@/lib/lesson-calendar";
import { ROLES } from "@/lib/constants";

/**
 * Calendario personale in abbonamento (webcal://…/feed/<userId>.ics?sig=…).
 * Docente: le lezioni delle proprie edizioni (admin: tutte). Allieva: le lezioni dei percorsi attivi.
 * Apple/Google Calendar lo riscaricano periodicamente: spostamenti e nuove lezioni compaiono da soli.
 */
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const userId = (await params).file.replace(/\.ics$/, "");
  if (!verify("feed", userId, new URL(req.url).searchParams.get("sig"))) return new Response("Link non valido", { status: 403 });
  const user = await db.user.findUnique({ where: { id: userId }, include: { student: true } });
  if (!user || !user.active) return new Response("Non trovato", { status: 404 });

  const since = new Date(Date.now() - 60 * 86400_000);
  const editionWhere =
    user.role === ROLES.STUDENT
      ? { enrollments: { some: { studentId: user.student?.id ?? "-", status: { in: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] } } } }
      : user.role === ROLES.ADMIN ? {} : { teacherId: user.id };
  const lessons = await db.lesson.findMany({
    where: { date: { gte: since }, edition: editionWhere },
    include: { edition: { include: { courseType: true, teacher: true } } },
    orderBy: { date: "asc" },
  });
  const events = lessons.map(lessonEvent).filter((e): e is CalendarEvent => !!e);
  return new Response(buildCalendar(events, { name: user.role === ROLES.STUDENT ? "LN · Le mie lezioni" : "LN · Lezioni" }), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" },
  });
}
