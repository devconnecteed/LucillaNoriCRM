import { requireStaff } from "@/lib/auth";
import { saveCourseType } from "@/server/courses";
import { ActionForm } from "@/components/action-form";
import { CourseTypeFields } from "@/components/course-type-fields";
import { Button, ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Nuovo corso" };

export default async function NewCourseTypePage() {
  await requireStaff();
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Catalogo della scuola" title="Crea un corso" subtitle="Una tipologia è il modello del percorso: la userai per creare edizioni e preventivi." />
      <Card>
        <ActionForm action={saveCourseType.bind(null, null)} className="space-y-6">
          <CourseTypeFields />
          <div className="flex justify-end gap-2.5 border-t border-line pt-5">
            <ButtonLink variant="secondary" href="/docente/corsi">Annulla</ButtonLink>
            <Button>Crea corso</Button>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
