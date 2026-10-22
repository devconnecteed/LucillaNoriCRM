import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { effectiveStatus } from "@/lib/guards";
import { loadProgress } from "@/lib/progress";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/constants";
import { ProgressTable } from "@/components/progress-table";
import { Badge, Card, Empty, fmtDate, statusTone } from "@/components/ui";

export const metadata = { title: "La mia area" };

export default async function StudentHome() {
  const user = await requireUser("STUDENT");
  if (!user.student) return <Empty>Profilo allieva non collegato. Contatta la tua insegnante.</Empty>;
  const studentId = user.student.id;

  const [enrollments, progress] = await Promise.all([
    db.enrollment.findMany({
      where: { studentId },
      include: {
        edition: { include: { courseType: true, lessons: { orderBy: { number: "asc" } } } },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-ln-900">Ciao {user.student.firstName}!</h1>
        <p className="text-sm text-stone-600">Ecco il tuo percorso.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-serif text-lg text-ln-900">Da compilare</h2>
        {todo.length ? (
          <ul className="space-y-2">
            {todo.map((a) => (
              <li key={a.id}>
                <Link href={`/allieva/questionari/${a.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-ln-50 p-4 transition hover:bg-ln-100">
                  <span>
                    <span className="block font-medium text-ln-900">{a.version.template.title}</span>
                    {a.dueAt && <span className="text-xs text-stone-600">entro il {fmtDate(a.dueAt)}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-ln-700">{a.responses[0] && a.status === "IN_PROGRESS" ? "Riprendi →" : "Inizia →"}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty>Nessun questionario in sospeso. Brava!</Empty>}
      </Card>

      {enrollments.map((e) => {
        const present = e.attendances.filter((x) => x.present).length;
        const next = e.edition.lessons.find((l) => l.date && l.date >= new Date(now.toDateString()));
        return (
          <Card key={e.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg text-ln-900">{e.edition.courseType.title}</h2>
              <Badge tone={statusTone(e.status)}>{ENROLLMENT_STATUS_LABELS[e.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-stone-600">Lezioni frequentate: {present} di {e.edition.lessons.length}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ln-100">
              <div className="h-full bg-ln-600" style={{ width: `${e.edition.lessons.length ? (present / e.edition.lessons.length) * 100 : 0}%` }} />
            </div>
            {next && <p className="mt-3 text-sm">Prossimo appuntamento: <b>{fmtDate(next.date)}</b>{next.topic && ` · ${next.topic}`}</p>}
          </Card>
        );
      })}

      <Card>
        <h2 className="mb-3 font-serif text-lg text-ln-900">Feedback e risultati</h2>
        {results.length ? (
          <ul className="divide-y divide-stone-100">
            {results.map((a) => (
              <li key={a.id}>
                <Link href={`/allieva/risultati/${a.responses[0].id}`} className="flex justify-between gap-3 py-3 hover:text-ln-700">
                  <span>{a.version.template.title}</span>
                  <span className="text-xs text-stone-500">{fmtDate(a.responses[0].publishedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty>La tua insegnante pubblicherà qui il suo riscontro.</Empty>}
      </Card>

      {progress.rows.length > 0 && (
        <Card>
          <h2 className="mb-3 font-serif text-lg text-ln-900">I tuoi progressi</h2>
          <ProgressTable {...progress} />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-serif text-lg text-ln-900">Attestati</h2>
        {certificates.length ? (
          <ul className="space-y-2">
            {certificates.map((c) => (
              <li key={c.id}>
                <a href={`/api/attestati/${c.id}`} target="_blank" className="flex justify-between gap-3 rounded-xl bg-ln-50 p-4 hover:bg-ln-100">
                  <span>{c.title} · {c.courseTitle}</span><span className="text-sm text-ln-700">Scarica PDF</span>
                </a>
              </li>
            ))}
          </ul>
        ) : <Empty>Al termine del percorso troverai qui il tuo attestato di partecipazione.</Empty>}
      </Card>
    </div>
  );
}
