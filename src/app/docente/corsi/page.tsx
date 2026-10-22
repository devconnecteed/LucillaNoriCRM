import Link from "next/link";
import type { CourseType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff, editionScope } from "@/lib/auth";
import { EDITION_STATUS_LABELS, MODE_LABELS } from "@/lib/constants";
import { createEdition, saveCourseType, setCourseTypeStatus } from "@/server/courses";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, Card, Empty, Field, PageHeader, Table, Td, fmtDate, statusTone } from "@/components/ui";

export const metadata = { title: "Corsi" };

function CourseTypeFields({ ct }: { ct?: CourseType }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Titolo *"><input className="input" name="title" defaultValue={ct?.title} required /></Field>
      <Field label="Categoria"><input className="input" name="category" defaultValue={ct?.category ?? ""} /></Field>
      <Field label="N. lezioni"><input className="input" type="number" min={0} name="durationLessons" defaultValue={ct?.durationLessons ?? ""} /></Field>
      <Field label="Ore totali"><input className="input" type="number" min={0} step={0.5} name="durationHours" defaultValue={ct?.durationHours ?? ""} /></Field>
      <Field label="Modalità">
        <select className="input" name="mode" defaultValue={ct?.mode ?? "BOTH"}>
          {Object.entries(MODE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="certificateEnabled" defaultChecked={ct?.certificateEnabled ?? true} /> Rilascia attestato di partecipazione</label>
      <Field label="Descrizione"><textarea className="input" name="description" defaultValue={ct?.description ?? ""} /></Field>
      <Field label="Obiettivi"><textarea className="input" name="objectives" defaultValue={ct?.objectives ?? ""} /></Field>
      <Field label="Programma"><textarea className="input" name="program" defaultValue={ct?.program ?? ""} /></Field>
      <Field label="Prerequisiti"><textarea className="input" name="prerequisites" defaultValue={ct?.prerequisites ?? ""} /></Field>
    </div>
  );
}

export default async function CoursesPage() {
  const user = await requireStaff();
  const [types, editions] = await Promise.all([
    db.courseType.findMany({ orderBy: [{ status: "asc" }, { title: "asc" }], include: { _count: { select: { editions: true } } } }),
    db.courseEdition.findMany({
      where: editionScope(user),
      include: { courseType: true, teacher: true, lessons: true, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const activeTypes = types.filter((t) => t.status === "ACTIVE");

  return (
    <>
      <PageHeader title="Corsi" subtitle="Tipologie configurabili ed edizioni (percorsi individuali o di gruppo)" />

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-xl text-ln-900">Edizioni e percorsi</h2>
        {editions.length ? (
          <Table head={["Edizione", "Tipologia", "Docente", "Inizio", "Lezioni", "Iscritte", "Stato"]}>
            {editions.map((e) => (
              <tr key={e.id} className="hover:bg-ln-50/50">
                <Td><Link className="font-medium text-ln-800 hover:underline" href={`/docente/corsi/${e.id}`}>{e.title}</Link></Td>
                <Td>{e.courseType.title}</Td>
                <Td>{e.teacher.name}</Td>
                <Td>{fmtDate(e.startDate)}</Td>
                <Td>{e.lessons.length}</Td>
                <Td>{e._count.enrollments}</Td>
                <Td><Badge tone={statusTone(e.status)}>{EDITION_STATUS_LABELS[e.status]}</Badge></Td>
              </tr>
            ))}
          </Table>
        ) : <Empty>Nessuna edizione: creane una qui sotto.</Empty>}

        <Card className="mt-4">
          <h3 className="mb-3 font-medium text-ln-900">Nuova edizione</h3>
          <ActionForm action={createEdition} className="grid gap-3 sm:grid-cols-3">
            <Field label="Tipologia *">
              <select className="input" name="courseTypeId" required>
                {activeTypes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </Field>
            <Field label="Titolo" hint="Es. “Sposa – Maria R. – giugno 2027”. Vuoto = nome tipologia."><input className="input" name="title" /></Field>
            <Field label="Data prima lezione" hint="Le lezioni successive vengono proposte a cadenza settimanale."><input className="input" type="date" name="startDate" /></Field>
            <Field label="N. lezioni" hint="Vuoto = da tipologia."><input className="input" type="number" min={0} max={50} name="lessons" /></Field>
            <Field label="Durata lezione (min)"><input className="input" type="number" min={15} name="durationMin" defaultValue={60} /></Field>
            <Field label="Frequenza minima per attestato (%)"><input className="input" type="number" min={0} max={100} name="minAttendancePct" defaultValue={80} /></Field>
            <div className="sm:col-span-3"><Button>Crea edizione</Button></div>
          </ActionForm>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-ln-900">Tipologie di corso</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {types.map((t) => (
            <Card key={t.id} className={t.status === "ARCHIVED" ? "opacity-60" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg text-ln-900">{t.title}</h3>
                  <p className="text-sm text-stone-600">{MODE_LABELS[t.mode]} · {t.durationLessons ?? "?"} lezioni · {t.durationHours ?? "?"} ore · {t._count.editions} edizioni</p>
                </div>
                {t.status === "ARCHIVED" ? <Badge tone="red">Archiviata</Badge> : <Badge tone="green">Attiva</Badge>}
              </div>
              {t.objectives && <p className="mt-2 text-sm">{t.objectives}</p>}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-ln-700">Modifica</summary>
                <ActionForm action={saveCourseType.bind(null, t.id)} className="mt-3 space-y-3">
                  <CourseTypeFields ct={t} />
                  <Button>Salva</Button>
                </ActionForm>
                <form action={setCourseTypeStatus.bind(null, t.id, t.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED")} className="mt-2">
                  <Button variant="ghost">{t.status === "ARCHIVED" ? "Riattiva" : "Archivia"}</Button>
                </form>
              </details>
            </Card>
          ))}
        </div>
        <Card className="mt-4">
          <details>
            <summary className="cursor-pointer font-medium text-ln-900">+ Nuova tipologia di corso</summary>
            <ActionForm action={saveCourseType.bind(null, null)} className="mt-3 space-y-3">
              <CourseTypeFields />
              <Button>Crea tipologia</Button>
            </ActionForm>
          </details>
        </Card>
      </section>
    </>
  );
}
