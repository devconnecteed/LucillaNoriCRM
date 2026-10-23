import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { effectiveStatus } from "@/lib/guards";
import { loadProgress } from "@/lib/progress";
import { dayAndDate, relativeDay } from "@/lib/dates";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/constants";
import { Icon } from "@/components/icons";
import { ProgressTable } from "@/components/progress-table";
import { AddToCalendar } from "@/components/add-to-calendar";
import { SubscribeCalendar } from "@/components/subscribe-calendar";
import { feedUrls, lessonCalendarLinks } from "@/lib/lesson-calendar";
import { Badge, Card, DateBox, Empty, PanelTitle, fmtDate, fmtTime, statusTone } from "@/components/ui";

export const metadata = { title: "La mia area" };

export default async function StudentHome() {
  const user = await requireUser("STUDENT");
  if (!user.student) return <Empty>Profilo allieva non collegato. Contatta la tua insegnante.</Empty>;
  const studentId = user.student.id;

  const [enrollments, progress] = await Promise.all([
    db.enrollment.findMany({
      where: { studentId },
      include: {
        edition: { include: { courseType: true, teacher: true, lessons: { orderBy: { number: "asc" } } } },
        attendances: true,
        certificates: { where: { revokedAt: null } },
        assignments: {
          include: { version: { include: { template: true } }, responses: { orderBy: { attempt: "desc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    loadProgress(studentId, { publishedOnly: true }),
  ]);

  const all = enrollments.flatMap((e) => e.assignments);
  const todo = all.filter((a) => a.version.template.audience === "STUDENT" && !["COMPLETED", "EXPIRED"].includes(effectiveStatus(a)));
  const results = all.filter((a) => a.responses[0]?.published);
  const certificates = enrollments.flatMap((e) => e.certificates);
  const now = new Date();
  const current = enrollments.find((e) => ["NOT_STARTED", "IN_PROGRESS"].includes(e.status)) ?? enrollments[0];
  const next = enrollments.flatMap((e) => e.edition.lessons.map((l) => ({ ...l, course: e.edition.courseType.title })))
    .filter((l) => l.date && l.date >= now).sort((a, b) => +a.date! - +b.date!)[0];

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">La tua area · LN Stile e Portamento</div>
        <h1 className="font-serif text-[34px] leading-tight text-wine-dark">Ciao {user.student.firstName}.</h1>
        <p className="mt-1 text-[13px] text-muted">Qui trovi il tuo percorso, i questionari da compilare e il riscontro della tua insegnante.</p>
      </div>

      {current && (() => {
        const total = current.edition.lessons.length;
        const present = current.attendances.filter((x) => x.present).length;
        const pct = total ? Math.round((present / total) * 100) : 0;
        return (
          <section className="relative overflow-hidden rounded-[13px] bg-wine-dark p-6 text-white">
            <div className="relative z-10">
              <div className="eyebrow !text-[#d4b99c]">Il tuo percorso</div>
              <h2 className="font-serif text-[28px] leading-tight">{current.edition.courseType.title}</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-[#d4b99c]" style={{ width: `${pct}%` }} /></span>
                <span className="text-xs text-[#e6d9d9]">{present} di {total} lezioni</span>
              </div>
              {next ? (
                <p className="mt-4 text-[13px] text-[#e6d9d9]">
                  Prossimo appuntamento: <b className="text-white">{dayAndDate(next.date!)}{fmtTime(next.date) && ` alle ${fmtTime(next.date)}`}</b>{next.topic && ` · ${next.topic}`}
                </p>
              ) : <p className="mt-4 text-[13px] text-[#e6d9d9]"><Badge tone={statusTone(current.status)}>{ENROLLMENT_STATUS_LABELS[current.status]}</Badge></p>}
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-5 right-4 font-serif text-[150px] italic leading-[0.7] text-white/[0.055]">LN</div>
          </section>
        );
      })()}

      <Card>
        <PanelTitle title="Da compilare" action={todo.length > 0 && <Badge tone="pink">{todo.length}</Badge>} />
        {todo.length ? (
          <ul className="space-y-2.5">
            {todo.map((a) => (
              <li key={a.id}>
                <Link href={`/allieva/questionari/${a.id}`} className="flex items-center gap-3.5 rounded-[10px] border border-[#f2e3df] bg-[#faf4f2] p-4 transition hover:border-ln-300">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white text-wine"><Icon name="clipboard" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-wine-dark">{a.version.template.title}</span>
                    <span className="text-xs text-muted">{a.dueAt ? `Entro ${fmtDate(a.dueAt)}` : "Pochi minuti"}</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-wine">{a.responses[0] && a.status === "IN_PROGRESS" ? "Riprendi →" : "Inizia →"}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty icon="check">Nessun questionario in sospeso. Brava!</Empty>}
      </Card>

      {next && (
        <Card>
          <PanelTitle title="Prossimi incontri" />
          <ul>
            {enrollments.flatMap((e) => e.edition.lessons.filter((l) => l.date && l.date >= now).map((l) => ({ ...l, course: e.edition.courseType.title, edition: e.edition })))
              .sort((a, b) => +a.date! - +b.date!).slice(0, 3).map((l) => (
                <li key={l.id} className="flex items-center gap-3.5 border-b border-[#f2edeb] py-3 last:border-b-0">
                  <DateBox date={l.date!} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{fmtTime(l.date) ? `${fmtTime(l.date)} — ` : ""}{l.topic || `Lezione ${l.number}`}</div>
                    <div className="text-xs text-muted">{l.course} · lezione {l.number}{l.location && ` · ${l.location}`}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge tone={["Oggi", "Domani"].includes(relativeDay(l.date!)) ? "pink" : "neutral"}>{relativeDay(l.date!)}</Badge>
                    <AddToCalendar compact links={lessonCalendarLinks(l)} />
                  </div>
                </li>
              ))}
          </ul>
          <div className="mt-4 border-t border-[#f2edeb] pt-4">
            <SubscribeCalendar urls={feedUrls(user.id)} label="Sincronizza con il mio calendario" align="left" />
          </div>
        </Card>
      )}

      <Card>
        <PanelTitle title="Feedback e risultati" />
        {results.length ? (
          <ul className="divide-y divide-[#f2edeb]">
            {results.map((a) => (
              <li key={a.id}>
                <Link href={`/allieva/risultati/${a.responses[0].id}`} className="flex items-center justify-between gap-3 py-3 text-[13px] hover:text-wine">
                  <span className="font-semibold">{a.version.template.title}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">{fmtDate(a.responses[0].publishedAt)} <Icon name="chevron" className="h-4 w-4" /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty>La tua insegnante pubblicherà qui il suo riscontro.</Empty>}
      </Card>

      {progress.rows.length > 0 && (
        <Card>
          <PanelTitle title="I tuoi progressi" />
          <ProgressTable {...progress} />
        </Card>
      )}

      <Card>
        <PanelTitle title="Attestati" />
        {certificates.length ? (
          <ul className="space-y-2.5">
            {certificates.map((c) => (
              <li key={c.id}>
                <a href={`/api/attestati/${c.id}`} target="_blank" className="flex items-center gap-3.5 rounded-[10px] border border-[#f2e3df] bg-[#faf4f2] p-4 hover:border-ln-300">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white text-wine"><Icon name="award" /></span>
                  <span className="min-w-0 flex-1"><b className="block text-[14px] font-semibold text-wine-dark">{c.courseTitle}</b><span className="text-xs text-muted">{c.title} · n. {c.number}</span></span>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-wine"><Icon name="download" className="h-4 w-4" /> PDF</span>
                </a>
              </li>
            ))}
          </ul>
        ) : <Empty icon="award">Al termine del percorso troverai qui il tuo attestato di partecipazione.</Empty>}
      </Card>
    </div>
  );
}
