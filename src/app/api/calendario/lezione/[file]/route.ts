import { db } from "@/lib/db";
import { verify } from "@/lib/signing";
import { buildCalendar } from "@/lib/ics";
import { lessonEvent } from "@/lib/lesson-calendar";

/**
 * Singola lezione in formato .ics ("Aggiungi ad Apple Calendar / Outlook").
 * URL firmato: /api/calendario/lezione/<id>.ics?sig=… (apribile senza login dall'email).
 */
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const id = (await params).file.replace(/\.ics$/, "");
  if (!verify("lesson", id, new URL(req.url).searchParams.get("sig"))) return new Response("Link non valido", { status: 403 });
  const lesson = await db.lesson.findUnique({ where: { id }, include: { edition: { include: { courseType: true, teacher: true } } } });
  const event = lesson && lessonEvent(lesson);
  if (!event) return new Response("Lezione non pianificata", { status: 404 });
  return new Response(buildCalendar([event]), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="lezione-${lesson!.number}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
