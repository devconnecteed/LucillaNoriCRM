import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { createEdition } from "@/server/courses";
import { ActionForm } from "@/components/action-form";
import { Button, ButtonLink, Card, Empty, Field, FormStep, PageHeader } from "@/components/ui";

export const metadata = { title: "Nuova edizione" };

export default async function NewEditionPage({ searchParams }: { searchParams: Promise<{ corso?: string }> }) {
  const user = await requireStaff();
  const { corso } = await searchParams;
  const types = await db.courseType.findMany({ where: { status: "ACTIVE" }, orderBy: { title: "asc" } });
  const teachers = user.role === "ADMIN" ? await db.user.findMany({ where: { role: { in: ["TEACHER", "ADMIN"] }, active: true } }) : [];
  if (!types.length) return <Empty icon="book">Crea prima una tipologia di corso.</Empty>;

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Catalogo della scuola" title="Nuova edizione" subtitle="Un’edizione è il percorso concreto: date, lezioni, iscritte e presenze. Può essere individuale o di gruppo." />
      <Card>
        <ActionForm action={createEdition} className="space-y-7">
          <div>
            <FormStep n={1} title="Percorso" />
            <div className="grid gap-[18px] sm:grid-cols-2">
              <Field label="Tipologia *">
                <select className="input" name="courseTypeId" defaultValue={corso} required>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </Field>
              <Field label="Titolo" hint="Es. “Sposa · Martina B.” o “Stile · Ottobre 2026”. Vuoto = nome del corso."><input className="input" name="title" /></Field>
              {teachers.length > 1 && (
                <Field label="Docente">
                  <select className="input" name="teacherId" defaultValue={user.id}>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </Field>
              )}
            </div>
          </div>
          <div>
            <FormStep n={2} title="Calendario" description="Le lezioni vengono proposte a cadenza settimanale dalla prima data; potrai spostarle una per una." />
            <div className="grid gap-[18px] sm:grid-cols-3">
              <Field label="Prima lezione"><input className="input" type="datetime-local" name="startDate" /></Field>
              <Field label="N. lezioni" hint="Vuoto = lezioni standard del corso."><input className="input" type="number" min={0} max={50} name="lessons" /></Field>
              <Field label="Durata lezione (min)"><input className="input" type="number" min={15} name="durationMin" defaultValue={60} /></Field>
            </div>
          </div>
          <div>
            <FormStep n={3} title="Attestato" />
            <Field label="Frequenza minima per l’attestato (%)" className="max-w-xs"><input className="input" type="number" min={0} max={100} name="minAttendancePct" defaultValue={80} /></Field>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-line pt-5">
            <ButtonLink variant="secondary" href="/docente/corsi">Annulla</ButtonLink>
            <Button>Crea edizione</Button>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
