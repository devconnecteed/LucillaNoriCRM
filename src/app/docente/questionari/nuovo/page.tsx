import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { AUDIENCE_LABELS, PHASE_LABELS } from "@/lib/constants";
import { createTemplate } from "@/server/questionnaires";
import { Button, ButtonLink, Card, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Nuovo modello" };

export default async function NewTemplatePage() {
  await requireStaff();
  const courseTypes = await db.courseType.findMany({ where: { status: "ACTIVE" }, orderBy: { title: "asc" } });
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="La tua libreria didattica" title="Nuovo modello" subtitle="Imposta il modello, poi aggiungi sezioni e domande nell’editor. Per partire da un modello esistente aprilo e usa “Duplica”." />
      <Card>
        <form action={createTemplate} className="space-y-5">
          <Field label="Titolo del modello *"><input className="input" name="title" required placeholder="Es. Test di fine lezione · Moda" /></Field>
          <div className="grid gap-[18px] sm:grid-cols-3">
            <Field label="Corso">
              <select className="input" name="courseTypeId"><option value="">Tutti i corsi</option>{courseTypes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            </Field>
            <Field label="Fase di compilazione">
              <select className="input" name="phase" defaultValue="LESSON">{Object.entries(PHASE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </Field>
            <Field label="Compilato da">
              <select className="input" name="audience">{Object.entries(AUDIENCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </Field>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-line pt-5">
            <ButtonLink variant="secondary" href="/docente/questionari">Annulla</ButtonLink>
            <Button>Crea e apri l’editor</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
