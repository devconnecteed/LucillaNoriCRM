import Link from "next/link";
import { db } from "@/lib/db";
import { getStudentForStaff, requireStaff, editionScope } from "@/lib/auth";
import { effectiveStatus } from "@/lib/guards";
import { loadProgress } from "@/lib/progress";
import { ASSIGNMENT_STATUS_LABELS, CONSENT_LABELS, ENROLLMENT_STATUS_LABELS } from "@/lib/constants";
import { addTeacherNote, inviteStudent, recordConsent, revokeAccess, updateStudent } from "@/server/students";
import { enrollStudent } from "@/server/courses";
import { ActionForm } from "@/components/action-form";
import { StudentForm } from "@/components/student-form";
import { ProgressTable } from "@/components/progress-table";
import { Badge, Button, ButtonLink, Card, Empty, PageHeader, fmtDate, fmtDateTime, statusTone } from "@/components/ui";

export default async function StudentDossier({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creata?: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const { creata } = await searchParams;
  await getStudentForStaff(user, id);

  const student = await db.student.findUniqueOrThrow({
    where: { id },
    include: {
      user: { include: { invites: { orderBy: { createdAt: "desc" }, take: 1 } } },
      enrollments: {
        include: {
          edition: { include: { courseType: true, lessons: true } },
          attendances: true,
          certificates: true,
          assignments: { include: { version: { include: { template: true } }, responses: { orderBy: { attempt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      },
      consents: { orderBy: { createdAt: "desc" } },
      teacherNotes: { orderBy: { createdAt: "desc" } },
    },
  });
  const [editions, progress] = await Promise.all([
    db.courseEdition.findMany({ where: { ...editionScope(user), status: { in: ["PLANNED", "RUNNING"] }, enrollments: { none: { studentId: id } } }, include: { courseType: true } }),
    loadProgress(id),
  ]);
  const latestConsent = Object.fromEntries(Object.keys(CONSENT_LABELS).map((t) => [t, student.consents.find((c) => c.type === t)]));
  const account = student.user;
  const accessBadge = !account ? <Badge>Nessun accesso</Badge> : !account.active ? <Badge tone="red">Accesso revocato</Badge>
    : account.passwordHash ? <Badge tone="green">Accesso attivo</Badge> : <Badge tone="amber">Invito in attesa</Badge>;

  return (
    <>
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        subtitle={<span className="flex flex-wrap items-center gap-2">{student.email}{student.phone && ` · ${student.phone}`} {accessBadge}{student.isMinor && <Badge tone="amber">Minorenne</Badge>}</span>}
        actions={<ButtonLink variant="secondary" href={`/docente/valutazioni?allieva=${id}`}>Assegna questionario</ButtonLink>}
      />
      {creata && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Anagrafica creata. Ora puoi inviare l’invito e iscriverla a un corso.</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <h2 className="mb-4 font-serif text-lg text-ln-900">Percorsi</h2>
            {student.enrollments.length ? (
              <div className="space-y-4">
                {student.enrollments.map((en) => {
                  const present = en.attendances.filter((a) => a.present).length;
                  return (
                    <div key={en.id} className="rounded-xl border border-stone-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link className="font-medium text-ln-800 hover:underline" href={`/docente/corsi/${en.editionId}`}>{en.edition.title}</Link>
                        <Badge tone={statusTone(en.status)}>{ENROLLMENT_STATUS_LABELS[en.status]}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-stone-600">
                        {en.edition.courseType.title} · presenze {present}/{en.edition.lessons.length}
                        {en.certificates.some((c) => !c.revokedAt) && " · attestato emesso"}
                      </p>
                      {en.assignments.length > 0 && (
                        <ul className="mt-3 divide-y divide-stone-100 text-sm">
                          {en.assignments.map((a) => {
                            const r = a.responses[0];
                            const st = effectiveStatus(a);
                            return (
                              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                <Link className="hover:text-ln-700" href={a.version.template.audience === "TEACHER" && st !== "COMPLETED" ? `/docente/compila/${a.id}` : `/docente/compilazioni/${a.id}`}>
                                  {a.version.template.title} <span className="text-stone-400">v{a.version.version}</span>
                                </Link>
                                <span className="flex items-center gap-2">
                                  {r?.maxScore != null && r.status === "SUBMITTED" && <span className="text-xs">{r.manualScore ?? r.autoScore}/{r.maxScore}</span>}
                                  {r?.published && <Badge tone="pink">Pubblicato</Badge>}
                                  <Badge tone={statusTone(st)}>{ASSIGNMENT_STATUS_LABELS[st]}</Badge>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : <Empty>Non è ancora iscritta a nessun corso.</Empty>}
            {editions.length > 0 && (
              <form action={enrollStudent} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="studentId" value={id} />
                <select name="editionId" className="input max-w-sm" aria-label="Edizione">
                  {editions.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.courseType.title})</option>)}
                </select>
                <Button variant="secondary">Iscrivi</Button>
              </form>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 font-serif text-lg text-ln-900">Progressi</h2>
            <ProgressTable {...progress} />
          </Card>

          <details className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer font-serif text-lg text-ln-900">Modifica anagrafica</summary>
            <div className="mt-4"><StudentForm action={updateStudent.bind(null, id)} student={student} /></div>
          </details>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-serif text-lg text-ln-900">Accesso all’area riservata</h2>
            {account?.invites[0] && !account.passwordHash && (
              <p className="mb-3 text-xs text-stone-500">Ultimo invito: {fmtDateTime(account.invites[0].createdAt)} · scade {fmtDate(account.invites[0].expiresAt)}</p>
            )}
            <ActionForm action={inviteStudent.bind(null, id)}>
              <Button className="w-full">{account?.passwordHash ? "Invia link per reimpostare l’accesso" : account ? "Rinnova invito" : "Invia invito"}</Button>
            </ActionForm>
            {account?.active && (
              <form action={revokeAccess.bind(null, id)} className="mt-2">
                <Button variant="danger" className="w-full">Revoca accesso</Button>
              </form>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-serif text-lg text-ln-900">Dati riservati</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-stone-500">Obiettivi</dt><dd>{student.goals ?? "—"}</dd></div>
              <div><dt className="text-stone-500">Esperienza</dt><dd>{student.experience ?? "—"}</dd></div>
              <div className="rounded-lg bg-amber-50 p-2"><dt className="text-amber-800">Limitazioni fisiche (riservato)</dt><dd>{student.physicalNotes ?? "—"}</dd></div>
              {student.isMinor && <div><dt className="text-stone-500">Tutore</dt><dd>{student.guardianName} · {student.guardianEmail} {student.guardianPhone}</dd></div>}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-serif text-lg text-ln-900">Consensi</h2>
            <ul className="space-y-2 text-sm">
              {Object.entries(CONSENT_LABELS).map(([type, label]) => {
                const c = latestConsent[type];
                return (
                  <li key={type} className="flex items-center justify-between gap-2">
                    <span>{label}<br /><span className="text-xs text-stone-500">{c ? `${c.granted ? "Concesso" : "Revocato"} il ${fmtDate(c.createdAt)}` : "Non registrato"}</span></span>
                    <form action={recordConsent.bind(null, id)}>
                      <input type="hidden" name="type" value={type} />
                      <input type="hidden" name="granted" value={c?.granted ? "false" : "true"} />
                      <button className="text-xs text-ln-700 underline">{c?.granted ? "Revoca" : "Registra"}</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-3 font-serif text-lg text-ln-900">Note della docente</h2>
            <form action={addTeacherNote.bind(null, id)} className="mb-3 space-y-2">
              <textarea name="text" className="input" placeholder="Aggiungi una nota (non visibile all’allieva)" required />
              <Button variant="secondary">Aggiungi nota</Button>
            </form>
            <ul className="space-y-2 text-sm">
              {student.teacherNotes.map((n) => (
                <li key={n.id} className="rounded-lg bg-stone-50 p-2"><div className="text-xs text-stone-500">{fmtDateTime(n.createdAt)}</div><div className="whitespace-pre-wrap">{n.text}</div></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
