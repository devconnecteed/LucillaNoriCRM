import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, editionScope } from "@/lib/auth";
import { addDays, capitalize, sameDay, shortName, startOfDay, startOfWeek } from "@/lib/dates";
import { feedUrls, lessonCalendarLinks } from "@/lib/lesson-calendar";
import { AddToCalendar } from "@/components/add-to-calendar";
import { SubscribeCalendar } from "@/components/subscribe-calendar";
import { Icon } from "@/components/icons";
import { Badge, ButtonLink, Card, Empty, PageHeader, PanelTitle, cx, fmtTime } from "@/components/ui";

export const metadata = { title: "Calendario" };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isoMonth = (d: Date) => iso(d).slice(0, 7);
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", o).format(d);
const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
/** Un colore per tipologia di corso, come i calendari di Apple Calendar. */
const COURSE_COLORS = ["#742d43", "#af9570", "#4d7891", "#397b60", "#986b33", "#8c3d54"];

export default async function CalendarPage({ searchParams }: {
  searchParams: Promise<{ vista?: string; mese?: string; settimana?: string; giorno?: string; pianificata?: string }>;
}) {
  const user = await requireStaff();
  const sp = await searchParams;
  const view = sp.vista === "settimana" ? "settimana" : "mese";
  const today = new Date();
  const parse = (s?: string, suffix = "") => {
    const d = s ? new Date(`${s}${suffix}T12:00:00`) : null;
    return d && !Number.isNaN(+d) ? d : null;
  };
  const selectedDay = startOfDay(parse(sp.giorno) ?? today);
  const monthStart = (() => {
    const d = parse(sp.mese, "-01") ?? selectedDay;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  })();
  const weekStart = startOfWeek(parse(sp.settimana) ?? selectedDay);

  // Intervallo visibile: 6 settimane per il mese (come Apple Calendar), 7 giorni per la settimana
  const gridStart = view === "mese" ? startOfWeek(monthStart) : weekStart;
  const gridDays = view === "mese" ? 42 : 7;
  const days = Array.from({ length: gridDays }, (_, i) => addDays(gridStart, i));
  const rangeEnd = addDays(gridStart, gridDays);

  const [lessons, courseTypes, unscheduled] = await Promise.all([
    db.lesson.findMany({
      where: { edition: { ...editionScope(user), status: { not: "CANCELLED" } }, date: { gte: gridStart, lt: rangeEnd } },
      include: { edition: { include: { courseType: true, teacher: true, enrollments: { include: { student: true } }, _count: { select: { lessons: true } } } }, attendances: true },
      orderBy: { date: "asc" },
    }),
    db.courseType.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, title: true } }),
    db.lesson.findMany({
      where: { edition: { ...editionScope(user), status: { in: ["PLANNED", "RUNNING"] } }, date: null },
      include: { edition: true },
      orderBy: [{ editionId: "asc" }, { number: "asc" }],
      take: 12,
    }),
  ]);
  const colorOf = (courseTypeId: string) => COURSE_COLORS[Math.max(0, courseTypes.findIndex((c) => c.id === courseTypeId)) % COURSE_COLORS.length];
  const onDay = (d: Date) => lessons.filter((l) => l.date && sameDay(l.date, d));
  const dayLessons = onDay(selectedDay);
  const feed = feedUrls(user.id);

  const qs = (p: Record<string, string>) => `?${new URLSearchParams({ vista: view, ...p }).toString()}`;
  const prevHref = view === "mese"
    ? qs({ mese: isoMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)) })
    : qs({ settimana: iso(addDays(weekStart, -7)), giorno: iso(addDays(selectedDay, -7)) });
  const nextHref = view === "mese"
    ? qs({ mese: isoMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)) })
    : qs({ settimana: iso(addDays(weekStart, 7)), giorno: iso(addDays(selectedDay, 7)) });
  const dayHref = (d: Date) => view === "mese" ? qs({ mese: isoMonth(monthStart), giorno: iso(d) }) : qs({ settimana: iso(weekStart), giorno: iso(d) });
  const title = view === "mese"
    ? capitalize(fmt(monthStart, { month: "long" }))
    : `${fmt(weekStart, { day: "numeric" })}–${fmt(addDays(weekStart, 6), { day: "numeric", month: "long" })}`;
  const year = (view === "mese" ? monthStart : weekStart).getFullYear();

  return (
    <>
      <PageHeader eyebrow="Agenda didattica" title="Organizza le lezioni" subtitle="Pianifica gli incontri: docente e allieve ricevono l’invito da aggiungere al proprio calendario."
        actions={<>
          <SubscribeCalendar urls={feed} />
          <ButtonLink icon="plus" href={`/docente/calendario/pianifica?data=${iso(selectedDay)}`}>Pianifica lezione</ButtonLink>
        </>} />

      {sp.pianificata !== undefined && (
        <p role="status" className="mb-5 flex items-center gap-2 rounded-xl bg-ok-bg p-3 text-[13px] text-ok">
          <Icon name="check" className="h-4 w-4" /> Lezione pianificata{Number(sp.pianificata) > 0 ? ` · invito inviato a ${sp.pianificata} ${Number(sp.pianificata) === 1 ? "persona" : "persone"}` : ""}.
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="!p-0">
          {/* Barra stile Apple Calendar: titolo, Oggi, frecce, Mese/Settimana */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="font-serif text-[30px] leading-none text-wine-dark">{title} <span className="text-muted">{year}</span></h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-[#f2efed] p-0.5 text-xs font-semibold" role="tablist" aria-label="Vista">
                {(["mese", "settimana"] as const).map((v) => (
                  <Link key={v} role="tab" aria-selected={view === v} href={`?vista=${v}&giorno=${iso(selectedDay)}`}
                    className={cx("rounded-md px-3 py-1.5 capitalize", view === v ? "bg-white text-wine-dark shadow-sm" : "text-[#7e6f70]")}>{v}</Link>
                ))}
              </div>
              <div className="flex items-center rounded-lg border border-line bg-white">
                <Link href={prevHref} aria-label={view === "mese" ? "Mese precedente" : "Settimana precedente"} className="grid h-9 w-9 place-items-center text-wine hover:bg-ln-50"><Icon name="chevronLeft" className="h-4 w-4" /></Link>
                <Link href={`?vista=${view}`} className="px-2.5 text-xs font-semibold text-[#654653]">Oggi</Link>
                <Link href={nextHref} aria-label={view === "mese" ? "Mese successivo" : "Settimana successiva"} className="grid h-9 w-9 place-items-center text-wine hover:bg-ln-50"><Icon name="chevron" className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-line text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#978786]">
            {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
          </div>

          <div className={cx("grid grid-cols-7", view === "mese" ? "auto-rows-[minmax(64px,1fr)] md:auto-rows-[minmax(112px,1fr)]" : "auto-rows-[minmax(140px,auto)]")}>
            {days.map((d, i) => {
              const ls = onDay(d);
              const inMonth = view === "settimana" || d.getMonth() === monthStart.getMonth();
              const isToday = sameDay(d, today);
              const selected = sameDay(d, selectedDay);
              const max = view === "mese" ? 3 : 8;
              return (
                <Link key={d.toISOString()} href={dayHref(d)} scroll={false}
                  aria-label={`${fmt(d, { weekday: "long", day: "numeric", month: "long" })}${ls.length ? `, ${ls.length} lezioni` : ""}`}
                  aria-current={selected ? "date" : undefined}
                  className={cx("group relative min-w-0 border-line px-1 pb-1.5 pt-1 transition hover:bg-[#fdf9f7] sm:px-1.5",
                    i % 7 !== 6 && "border-r", i < gridDays - 7 && "border-b", !inMonth && "bg-[#faf8f7]", selected && "bg-[#faf0f1] hover:bg-[#faf0f1]")}>
                  <div className="flex justify-center md:justify-end">
                    <span className={cx("grid h-7 w-7 place-items-center rounded-full text-[13px]",
                      isToday ? "bg-wine font-bold text-white" : selected ? "font-bold text-wine ring-1 ring-wine" : inMonth ? "text-ink" : "text-[#c2b8b5]")}>
                      {d.getDate()}
                    </span>
                  </div>
                  {/* Mobile: pallini colorati, come Apple Calendar su iPhone */}
                  <div className="mt-1 flex flex-wrap justify-center gap-0.5 md:hidden">
                    {ls.slice(0, 4).map((l) => <span key={l.id} className="h-1.5 w-1.5 rounded-full" style={{ background: colorOf(l.edition.courseTypeId) }} />)}
                  </div>
                  {/* Desktop: eventi con orario */}
                  <ul className="mt-0.5 hidden space-y-0.5 md:block">
                    {ls.slice(0, max).map((l) => {
                      const c = colorOf(l.edition.courseTypeId);
                      return (
                        <li key={l.id} className="flex min-w-0 items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11px] leading-tight"
                          style={{ background: `${c}17`, color: c }}>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
                          <span className="shrink-0 font-semibold">{fmtTime(l.date)}</span>
                          <span className="truncate text-ink">{l.edition.courseType.title}</span>
                        </li>
                      );
                    })}
                    {ls.length > max && <li className="px-1.5 text-[10px] font-semibold text-muted">+{ls.length - max} altre</li>}
                  </ul>
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-5 py-3 text-[11px] text-muted">
            {courseTypes.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: colorOf(c.id) }} />{c.title}</span>
            ))}
          </div>
        </Card>

        <aside className="space-y-5">
          <Card>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow mb-1">{sameDay(selectedDay, today) ? "Oggi" : capitalize(fmt(selectedDay, { weekday: "long" }))}</div>
                <h2 className="font-serif text-[26px] leading-tight text-wine-dark">{fmt(selectedDay, { day: "numeric", month: "long" })}</h2>
              </div>
              <ButtonLink size="sm" variant="soft" icon="plus" href={`/docente/calendario/pianifica?data=${iso(selectedDay)}`}>Lezione</ButtonLink>
            </div>
            {dayLessons.length ? (
              <ul className="space-y-3">
                {dayLessons.map((l) => {
                  const c = colorOf(l.edition.courseTypeId);
                  const who = l.edition.enrollments.map((e) => shortName(e.student.firstName, e.student.lastName));
                  const end = new Date(l.date!.getTime() + l.durationMin * 60_000);
                  const past = l.date! < today;
                  return (
                    <li key={l.id} className="rounded-xl border border-line p-3.5" style={{ borderLeft: `3px solid ${c}` }}>
                      <div className="text-xs font-semibold" style={{ color: c }}>{fmtTime(l.date) ?? "Tutto il giorno"}{fmtTime(l.date) && ` – ${fmtTime(end)}`}</div>
                      <div className="mt-0.5 text-[14px] font-semibold">{l.topic || `Lezione ${l.number}`}</div>
                      <div className="mt-1 text-xs leading-relaxed text-muted">
                        {l.edition.courseType.title} · lezione {l.number} di {l.edition._count.lessons}
                        {who.length > 0 && <><br />{who.length > 4 ? `${who.length} allieve` : who.join(", ")}</>}
                        {l.location && <><br />{l.location}</>}
                      </div>
                      {past && !l.attendances.length && <div className="mt-2"><Badge tone="amber">Presenze da registrare</Badge></div>}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <ButtonLink size="sm" variant="secondary" href={`/docente/calendario/pianifica?lezione=${l.id}`}>Modifica</ButtonLink>
                        <ButtonLink size="sm" variant="secondary" href={`/docente/corsi/${l.editionId}`}>Presenze</ButtonLink>
                        <ButtonLink size="sm" variant="soft" href={`/docente/valutazioni/assegna?edizione=${l.editionId}&lezione=${l.id}`}>Valuta</ButtonLink>
                        <AddToCalendar compact links={lessonCalendarLinks(l)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty icon="calendar">Nessuna lezione in questo giorno.</Empty>}
          </Card>

          {unscheduled.length > 0 && (
            <Card>
              <PanelTitle title="Da pianificare" action={<span className="text-xs font-normal text-muted">{unscheduled.length} senza data</span>} />
              <ul className="space-y-2">
                {unscheduled.map((l) => (
                  <li key={l.id}>
                    <Link href={`/docente/calendario/pianifica?lezione=${l.id}&data=${iso(selectedDay)}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-line px-3.5 py-2.5 text-[13px] hover:border-ln-300">
                      <span className="truncate">{l.edition.title} · lezione {l.number}</span>
                      <span className="shrink-0 text-xs font-semibold text-wine">Fissa →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
