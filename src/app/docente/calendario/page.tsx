import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, editionScope } from "@/lib/auth";
import { addDays, sameDay, shortName, startOfWeek } from "@/lib/dates";
import { Icon } from "@/components/icons";
import { Badge, ButtonLink, Card, DateBox, Empty, PageHeader, PanelTitle, cx, fmtTime } from "@/components/ui";

export const metadata = { title: "Calendario" };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ settimana?: string }> }) {
  const user = await requireStaff();
  const { settimana } = await searchParams;
  const parsed = settimana ? new Date(`${settimana}T12:00:00`) : new Date();
  const weekStart = startOfWeek(Number.isNaN(+parsed) ? new Date() : parsed);
  const weekEnd = addDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const [lessons, unscheduled] = await Promise.all([
    db.lesson.findMany({
      where: { edition: { ...editionScope(user), status: { not: "CANCELLED" } }, date: { gte: weekStart, lt: weekEnd } },
      include: { edition: { include: { courseType: true, enrollments: { include: { student: true } }, _count: { select: { lessons: true } } } }, attendances: true },
      orderBy: { date: "asc" },
    }),
    db.lesson.findMany({
      where: { edition: { ...editionScope(user), status: { in: ["PLANNED", "RUNNING"] } }, date: null },
      include: { edition: true },
      orderBy: [{ editionId: "asc" }, { number: "asc" }],
      take: 12,
    }),
  ]);

  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", o).format(d);
  const range = `${fmt(weekStart, { day: "numeric" })}–${fmt(addDays(weekStart, 6), { day: "numeric", month: "long" })}`;

  return (
    <>
      <PageHeader eyebrow="Agenda didattica" title="Organizza le lezioni" subtitle="Un calendario con appuntamenti, presenze e questionari collegati."
        actions={<>
          <div className="flex items-center rounded-lg border border-line bg-white">
            <Link href={`?settimana=${iso(addDays(weekStart, -7))}`} aria-label="Settimana precedente" className="grid h-10 w-10 place-items-center text-wine hover:bg-ln-50"><Icon name="chevronLeft" className="h-4 w-4" /></Link>
            <Link href="?" className="px-2 text-[13px] font-semibold text-[#654653]" title="Torna a questa settimana">{range}</Link>
            <Link href={`?settimana=${iso(addDays(weekStart, 7))}`} aria-label="Settimana successiva" className="grid h-10 w-10 place-items-center text-wine hover:bg-ln-50"><Icon name="chevron" className="h-4 w-4" /></Link>
          </div>
          <ButtonLink icon="plus" href="/docente/corsi">Pianifica lezione</ButtonLink>
        </>} />

      <Card>
        <PanelTitle title={sameDay(weekStart, startOfWeek(today)) ? "Questa settimana" : `Settimana del ${fmt(weekStart, { day: "numeric", month: "long" })}`} action={<Badge tone="pink">{range}</Badge>} />
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {days.map((d) => {
            const count = lessons.filter((l) => l.date && sameDay(l.date, d)).length;
            const isToday = sameDay(d, today);
            return (
              <a key={d.toISOString()} href={count ? `#giorno-${iso(d)}` : undefined}
                className={cx("rounded-[10px] border px-1 py-3 text-center transition sm:py-4",
                  isToday ? "border-[#ecd8da] bg-[#f3dfe3]" : "border-[#f2e7e0] bg-[#faf6f4]", count > 0 && "hover:border-ln-300")}>
                <div className="text-[10px] uppercase text-[#7e6f70] sm:text-xs">{fmt(d, { weekday: "short" }).replace(".", "")}</div>
                <div className="mt-1 text-base font-semibold text-ink sm:text-lg">{d.getDate()}</div>
                <div className={cx("mt-1 text-[10px] sm:text-xs", count ? "text-wine" : "text-muted")}>
                  {isToday ? (count ? `Oggi · ${count} lez.` : "Oggi") : count ? `${count} lez.` : "—"}
                </div>
              </a>
            );
          })}
        </div>

        <h2 className="mb-2 mt-8 font-serif text-[23px] text-wine-dark">Incontri della settimana</h2>
        {lessons.length ? (
          <ul>
            {lessons.map((l) => {
              const who = l.edition.enrollments.map((e) => shortName(e.student.firstName, e.student.lastName));
              const past = l.date! < today;
              return (
                <li key={l.id} id={`giorno-${iso(l.date!)}`} className="flex flex-wrap items-center gap-3.5 border-b border-[#f2edeb] py-3.5 last:border-b-0 sm:flex-nowrap">
                  <DateBox date={l.date!} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{fmtTime(l.date) ? `${fmtTime(l.date)} — ` : ""}{l.topic || `Lezione ${l.number}`}</div>
                    <div className="mt-1 text-xs text-muted">
                      {[who.length > 3 ? `${who.length} allieve` : who.join(", "), l.edition.courseType.title, `Lezione ${l.number} di ${l.edition._count.lessons}`, `${l.durationMin} min`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {past && !l.attendances.length && <Badge tone="amber">Presenze da registrare</Badge>}
                    <ButtonLink size="sm" variant="secondary" href={`/docente/corsi/${l.editionId}`}>Presenze</ButtonLink>
                    <ButtonLink size="sm" variant="soft" href={`/docente/valutazioni/assegna?edizione=${l.editionId}&lezione=${l.id}`}>Valuta lezione</ButtonLink>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <Empty icon="calendar">Nessun incontro in questa settimana.</Empty>}
      </Card>

      {unscheduled.length > 0 && (
        <Card className="mt-5">
          <PanelTitle title="Da pianificare" action={<span className="text-xs font-normal text-muted">Lezioni senza data</span>} />
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {unscheduled.map((l) => (
              <li key={l.id}>
                <Link href={`/docente/corsi/${l.editionId}`} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3.5 py-2.5 text-[13px] hover:border-ln-300">
                  <span className="truncate">{l.edition.title} · lezione {l.number}</span>
                  <span className="shrink-0 text-xs font-semibold text-wine">Fissa data →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
