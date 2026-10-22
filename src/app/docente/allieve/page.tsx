import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, studentScope } from "@/lib/auth";
import { Badge, Button, ButtonLink, Empty, PageHeader, Table, Td, fmtDate } from "@/components/ui";

export const metadata = { title: "Allieve" };

const STATUS: Record<string, string> = { ACTIVE: "Attiva", INACTIVE: "Non attiva", ARCHIVED: "Archiviata" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; stato?: string; corso?: string }> }) {
  const user = await requireStaff();
  const { q = "", stato = "ACTIVE", corso = "" } = await searchParams;
  const courseTypes = await db.courseType.findMany({ orderBy: { title: "asc" } });
  const students = await db.student.findMany({
    where: {
      ...studentScope(user),
      ...(stato !== "ALL" ? { status: stato } : {}),
      ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}),
      ...(corso ? { enrollments: { some: { edition: { courseTypeId: corso } } } } : {}),
    },
    include: { user: true, enrollments: { include: { edition: { include: { courseType: true } } } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <>
      <PageHeader title="Allieve" subtitle={`${students.length} risultati`} actions={<ButtonLink href="/docente/allieve/nuova">+ Nuova allieva</ButtonLink>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" placeholder="Cerca nome, email, telefono" defaultValue={q} />
        <select className="input max-w-44" name="stato" defaultValue={stato}>
          <option value="ACTIVE">Attive</option><option value="INACTIVE">Non attive</option><option value="ARCHIVED">Archiviate</option><option value="ALL">Tutte</option>
        </select>
        <select className="input max-w-52" name="corso" defaultValue={corso}>
          <option value="">Tutti i corsi</option>
          {courseTypes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <Button variant="secondary">Filtra</Button>
      </form>
      {students.length ? (
        <Table head={["Allieva", "Contatti", "Corsi", "Accesso", "Creata"]}>
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-ln-50/50">
              <Td><Link className="font-medium text-ln-800 hover:underline" href={`/docente/allieve/${s.id}`}>{s.lastName} {s.firstName}</Link>
                {s.status !== "ACTIVE" && <div><Badge>{STATUS[s.status]}</Badge></div>}</Td>
              <Td className="text-stone-600">{s.email}<br />{s.phone}</Td>
              <Td>{s.enrollments.map((e) => <div key={e.id}>{e.edition.courseType.title}</div>)}</Td>
              <Td>{!s.user ? <Badge>Nessun invito</Badge> : !s.user.active ? <Badge tone="red">Revocato</Badge> : s.user.passwordHash ? <Badge tone="green">Attivo</Badge> : <Badge tone="amber">Invitata</Badge>}</Td>
              <Td className="text-stone-500">{fmtDate(s.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      ) : <Empty>Nessuna allieva trovata.</Empty>}
    </>
  );
}
