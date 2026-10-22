import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, studentScope } from "@/lib/auth";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/constants";
import { Icon } from "@/components/icons";
import { Badge, ButtonLink, Empty, FilterChips, Initials, PageHeader, Progress, Table, Td, fmtDate, statusTone } from "@/components/ui";

export const metadata = { title: "Allieve" };

const FILTERS = [
  { value: "tutte", label: "Tutte" },
  { value: "in-corso", label: "In corso" },
  { value: "completate", label: "Completate" },
  { value: "archiviate", label: "Archiviate" },
];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string }> }) {
  const user = await requireStaff();
  const { q = "", filtro = "tutte" } = await searchParams;

  const where = {
    ...studentScope(user),
    ...(filtro === "archiviate" ? { status: { in: ["ARCHIVED", "INACTIVE"] } } : { status: "ACTIVE" }),
    ...(filtro === "in-corso" ? { enrollments: { some: { status: { in: ["NOT_STARTED", "IN_PROGRESS"] } } } } : {}),
    ...(filtro === "completate" ? { enrollments: { some: { status: "COMPLETED" } } } : {}),
    ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } },
      { enrollments: { some: { edition: { courseType: { title: { contains: q } } } } } }] } : {}),
  };
  const [students, total] = await Promise.all([
    db.student.findMany({
      where,
      include: {
        user: true,
        enrollments: {
          include: {
            edition: { include: { courseType: true, lessons: true } },
            attendances: { include: { lesson: true } },
            assignments: { include: { responses: { select: { submittedAt: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.student.count({ where: { ...studentScope(user), status: "ACTIVE" } }),
  ]);

  const qs = (f: string) => `?filtro=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader eyebrow="Persone e percorsi" title="Le tue allieve" subtitle="Una scheda personale per seguire l’evoluzione di ciascuna allieva."
        actions={<ButtonLink icon="plus" href="/docente/allieve/nuova">Nuova allieva</ButtonLink>} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterChips active={filtro} items={FILTERS.map((f) => ({ ...f, label: f.value === "tutte" ? `Tutte ${total}` : f.label, href: qs(f.value) }))} />
        <form role="search" className="relative w-full sm:w-64">
          <input type="hidden" name="filtro" value={filtro} />
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c9390]" />
          <input className="input !pl-9" name="q" placeholder="Cerca nome, email o corso…" defaultValue={q} aria-label="Cerca allieve" />
        </form>
      </div>

      {students.length ? (
        <Table head={["Allieva", "Percorso", "Progressi", "Stato", "Ultima attività", ""]}>
          {students.map((s) => {
            const en = s.enrollments[0];
            const total = en?.edition.lessons.length ?? 0;
            const done = en?.attendances.filter((a) => a.present).length ?? 0;
            const activity = [
              s.updatedAt,
              ...s.enrollments.flatMap((e) => e.attendances.map((a) => a.lesson.date)),
              ...s.enrollments.flatMap((e) => e.assignments.flatMap((a) => a.responses.map((r) => r.submittedAt))),
            ].filter((d): d is Date => !!d && d <= new Date()).sort((a, b) => +b - +a)[0];
            return (
              <tr key={s.id}>
                <Td>
                  <Link href={`/docente/allieve/${s.id}`} className="flex items-center gap-3">
                    <Initials name={`${s.firstName} ${s.lastName}`} />
                    <span className="min-w-0">
                      <span className="block font-bold hover:text-wine">{s.firstName} {s.lastName}</span>
                      <span className="block truncate text-xs text-muted">{s.email}</span>
                    </span>
                  </Link>
                </Td>
                <Td>{en ? en.edition.courseType.title : <span className="text-muted">Nessun percorso</span>}{s.enrollments.length > 1 && <span className="ml-1 text-xs text-muted">+{s.enrollments.length - 1}</span>}</Td>
                <Td>{en && total ? <Progress value={(done / total) * 100} /> : <span className="text-muted">—</span>}</Td>
                <Td>
                  {s.status !== "ACTIVE" ? <Badge tone="red">{s.status === "ARCHIVED" ? "Archiviata" : "Non attiva"}</Badge>
                    : en ? <Badge tone={statusTone(en.status)}>{ENROLLMENT_STATUS_LABELS[en.status]}</Badge>
                    : <Badge>Da iscrivere</Badge>}
                  {s.user && !s.user.passwordHash && s.user.active && <div className="mt-1 text-[11px] text-warn">Invito in attesa</div>}
                </Td>
                <Td className="text-muted">{fmtDate(activity)}</Td>
                <Td className="text-right"><ButtonLink size="sm" variant="secondary" href={`/docente/allieve/${s.id}`}>Apri scheda →</ButtonLink></Td>
              </tr>
            );
          })}
        </Table>
      ) : <Empty icon="users">{q ? `Nessuna allieva trovata per “${q}”.` : "Nessuna allieva in questo elenco."}</Empty>}

      <p className="callout mt-6">
        Aprendo un’allieva trovi anagrafica e consensi, percorsi, presenze, questionari, valutazioni della docente e attestati.
        I dati relativi alla salute sono separati e visibili solo alla docente di riferimento.
      </p>
    </>
  );
}
