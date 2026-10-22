import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, studentScope, editionScope } from "@/lib/auth";
import { enrollmentWhereForStaff } from "@/lib/guards";
import { ASSIGNMENT_STATUS_LABELS } from "@/lib/constants";
import { Badge, ButtonLink, Card, Empty, PageHeader, Stat, fmtDate, statusTone } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireStaff();
  const enrollmentWhere = enrollmentWhereForStaff(user);

  const [students, editions, pending, toReview, toCertify, upcoming, quotes] = await Promise.all([
    db.student.count({ where: { ...studentScope(user), status: "ACTIVE" } }),
    db.courseEdition.findMany({ where: { ...editionScope(user), status: { in: ["PLANNED", "RUNNING"] } }, include: { courseType: true, lessons: true, _count: { select: { enrollments: true } } } }),
    db.assignment.findMany({
      where: { enrollment: enrollmentWhere, status: { not: "COMPLETED" }, version: { template: { audience: "STUDENT" } } },
      include: { version: { include: { template: true } }, enrollment: { include: { student: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.response.findMany({
      where: { status: "SUBMITTED", published: false, assignment: { enrollment: enrollmentWhere } },
      include: { assignment: { include: { version: { include: { template: true } }, enrollment: { include: { student: true } } } } },
      orderBy: { submittedAt: "desc" },
      take: 8,
    }),
    db.enrollment.findMany({
      where: { ...enrollmentWhere, status: "COMPLETED", certificates: { none: { revokedAt: null } } },
      include: { student: true, edition: { include: { courseType: true } } },
    }),
    db.lesson.findMany({
      where: { edition: { ...editionScope(user), status: { in: ["PLANNED", "RUNNING"] } }, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      include: { edition: true },
      orderBy: { date: "asc" },
      take: 5,
    }),
    db.quote.findMany({
      where: { ...(user.role === "ADMIN" ? {} : { teacherId: user.id }), OR: [{ status: "SENT" }, { status: "ACCEPTED", editionId: null }] },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const acceptedQuotes = quotes.filter((q) => q.status === "ACCEPTED");

  const closing = editions.filter((e) => e.lessons.length && e.lessons.every((l) => l.date && l.date < new Date()));

  return (
    <>
      <PageHeader title={`Buongiorno, ${user.name.split(" ")[0]}`} subtitle="Il riepilogo di oggi"
        actions={<><ButtonLink href="/docente/allieve/nuova">+ Nuova allieva</ButtonLink><ButtonLink variant="secondary" href="/docente/valutazioni">Assegna questionario</ButtonLink></>} />

      {acceptedQuotes.length > 0 && (
        <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <b>{acceptedQuotes.length === 1 ? "1 preventivo accettato" : `${acceptedQuotes.length} preventivi accettati`}</b> da avviare:{" "}
          {acceptedQuotes.map((q, i) => <span key={q.id}>{i > 0 && ", "}<Link className="underline" href={`/docente/preventivi/${q.id}`}>{q.prospectFirstName} {q.prospectLastName}</Link></span>)}
        </div>
      )}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat label="Allieve attive" value={students} href="/docente/allieve" />
        <Stat label="Edizioni in corso" value={editions.length} href="/docente/corsi" />
        <Stat label="Preventivi in attesa" value={quotes.length - acceptedQuotes.length} href="/docente/preventivi?stato=SENT" />
        <Stat label="Questionari pendenti" value={pending.length} />
        <Stat label="Da rivedere" value={toReview.length} href="/docente/valutazioni" />
        <Stat label="Attestati da emettere" value={toCertify.length} href="/docente/attestati" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-serif text-lg text-ln-900">Compilazioni da rivedere e pubblicare</h2>
          {toReview.length ? (
            <ul className="divide-y divide-stone-100">
              {toReview.map((r) => (
                <li key={r.id}>
                  <Link href={`/docente/compilazioni/${r.assignmentId}`} className="flex items-center justify-between gap-3 py-3 hover:text-ln-700">
                    <span><b>{r.assignment.enrollment.student.firstName} {r.assignment.enrollment.student.lastName}</b> · {r.assignment.version.template.title}</span>
                    <span className="shrink-0 text-xs text-stone-500">{fmtDate(r.submittedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>Nessuna compilazione in attesa.</Empty>}
        </Card>

        <Card>
          <h2 className="mb-4 font-serif text-lg text-ln-900">Questionari in attesa delle allieve</h2>
          {pending.length ? (
            <ul className="divide-y divide-stone-100">
              {pending.map((a) => (
                <li key={a.id}>
                  <Link href={`/docente/compilazioni/${a.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-ln-700">
                    <span>{a.enrollment.student.firstName} {a.enrollment.student.lastName} · {a.version.template.title}</span>
                    <Badge tone={statusTone(a.status)}>{ASSIGNMENT_STATUS_LABELS[a.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>Tutto compilato.</Empty>}
        </Card>

        <Card>
          <h2 className="mb-4 font-serif text-lg text-ln-900">Prossime lezioni</h2>
          {upcoming.length ? (
            <ul className="divide-y divide-stone-100">
              {upcoming.map((l) => (
                <li key={l.id}>
                  <Link href={`/docente/corsi/${l.editionId}`} className="flex justify-between gap-3 py-3 hover:text-ln-700">
                    <span>{l.edition.title} · lezione {l.number}{l.topic ? ` – ${l.topic}` : ""}</span>
                    <span className="shrink-0 text-xs text-stone-500">{fmtDate(l.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>Nessuna lezione in calendario.</Empty>}
        </Card>

        <Card>
          <h2 className="mb-4 font-serif text-lg text-ln-900">Corsi in conclusione e attestati</h2>
          {closing.length || toCertify.length ? (
            <ul className="divide-y divide-stone-100 text-sm">
              {closing.map((e) => (
                <li key={e.id} className="py-3"><Link className="hover:text-ln-700" href={`/docente/corsi/${e.id}`}>{e.title}: tutte le lezioni svolte, verifica completamenti</Link></li>
              ))}
              {toCertify.map((en) => (
                <li key={en.id} className="py-3"><Link className="hover:text-ln-700" href={`/docente/attestati?iscrizione=${en.id}`}>Attestato da emettere: {en.student.firstName} {en.student.lastName} · {en.edition.courseType.title}</Link></li>
              ))}
            </ul>
          ) : <Empty>Niente da segnalare.</Empty>}
        </Card>
      </div>
    </>
  );
}
