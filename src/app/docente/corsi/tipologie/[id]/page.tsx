import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { saveCourseType, setCourseTypeStatus } from "@/server/courses";
import { ActionForm } from "@/components/action-form";
import { CourseTypeFields } from "@/components/course-type-fields";
import { Badge, Button, ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Configura percorso" };

export default async function CourseTypePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const ct = await db.courseType.findUnique({ where: { id }, include: { _count: { select: { editions: true, quotes: true } } } });
  if (!ct) notFound();
  const archived = ct.status === "ARCHIVED";
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Configura percorso" title={ct.title}
        subtitle={<span className="flex flex-wrap items-center gap-2">{archived ? <Badge tone="red">Archiviato</Badge> : <Badge tone="green">Attivo</Badge>} {ct._count.editions} edizioni · {ct._count.quotes} preventivi</span>}
        actions={<>
          {!archived && <ButtonLink variant="secondary" icon="plus" href={`/docente/corsi/edizioni/nuova?corso=${id}`}>Nuova edizione</ButtonLink>}
          <form action={setCourseTypeStatus.bind(null, id, archived ? "ACTIVE" : "ARCHIVED")}>
            <Button variant={archived ? "secondary" : "danger"}>{archived ? "Riattiva" : "Archivia"}</Button>
          </form>
        </>} />
      <Card>
        <ActionForm action={saveCourseType.bind(null, id)} className="space-y-6">
          <CourseTypeFields ct={ct} />
          <div className="flex justify-end gap-2.5 border-t border-line pt-5">
            <ButtonLink variant="secondary" href="/docente/corsi">Torna ai corsi</ButtonLink>
            <Button>Salva</Button>
          </div>
        </ActionForm>
      </Card>
      {archived && <p className="callout mt-5">Un corso archiviato non compare tra le scelte per nuove edizioni e preventivi; edizioni e attestati esistenti restano invariati.</p>}
    </div>
  );
}
