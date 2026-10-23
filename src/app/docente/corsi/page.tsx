import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, editionScope } from "@/lib/auth";
import { EDITION_STATUS_LABELS } from "@/lib/constants";
import { euro } from "@/lib/quote";
import { CoursesTabs } from "@/components/courses-tabs";
import { Icon, type IconName } from "@/components/icons";
import { Badge, ButtonLink, Empty, PageHeader, SectionHead, Table, Td, fmtDate, statusTone } from "@/components/ui";

export const metadata = { title: "Percorsi e corsi" };

const COURSE_ICONS: IconName[] = ["book", "award", "users", "sparkle"];

export default async function CoursesPage() {
  const user = await requireStaff();
  const [types, editions] = await Promise.all([
    db.courseType.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      include: { editions: { include: { _count: { select: { enrollments: { where: { status: { in: ["NOT_STARTED", "IN_PROGRESS"] } } } } } } } },
    }),
    db.courseEdition.findMany({
      where: editionScope(user),
      include: { courseType: true, lessons: true, _count: { select: { enrollments: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
  ]);
  const now = new Date();

  return (
    <>
      <PageHeader eyebrow="Catalogo della scuola" title="Percorsi su misura"
        subtitle="Le tipologie definiscono il metodo; le edizioni gestiscono date, durata, iscrizioni e presenze."
        actions={<>
          <ButtonLink variant="secondary" icon="file" href="/docente/corsi/preventivi/nuovo">Crea preventivo</ButtonLink>
          <ButtonLink icon="plus" href="/docente/corsi/tipologie/nuova">Crea un corso</ButtonLink>
        </>} />
      <CoursesTabs user={user} active="catalogo" />

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {types.map((t, i) => {
          const students = t.editions.reduce((n, e) => n + e._count.enrollments, 0);
          const archived = t.status === "ARCHIVED";
          return (
            <article key={t.id} className={`flex flex-col rounded-xl border border-line bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-[#dcc0c5] ${archived ? "opacity-60" : ""}`}>
              <div className="mb-[18px] flex items-center justify-between">
                <div className="grid h-[46px] w-[46px] place-items-center rounded-[10px] bg-[#f6e8e8] text-wine"><Icon name={COURSE_ICONS[i % COURSE_ICONS.length]} /></div>
                {archived ? <Badge tone="red">Archiviato</Badge> : <Badge tone="green">Attivo</Badge>}
              </div>
              <h2 className="mb-2.5 font-serif text-[24px] leading-tight text-wine-dark">{t.title}</h2>
              <p className="min-h-11 flex-1 text-[13px] leading-relaxed text-muted">{t.description || t.objectives || "—"}</p>
              <div className="mt-5 flex justify-between border-t border-line pt-4 text-xs text-[#746765]">
                <div><b className="block font-serif text-[19px] font-normal text-wine">{t.durationLessons ?? "—"}</b>Lezioni standard</div>
                <div className="text-center"><b className="block font-serif text-[19px] font-normal text-wine">{t.packagePriceCents != null ? euro(t.packagePriceCents) : "—"}</b>Pacchetto</div>
                <div className="text-right"><b className="block font-serif text-[19px] font-normal text-wine">{students}</b>Allieve</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink size="sm" variant="secondary" href={`/docente/corsi/tipologie/${t.id}`}>Configura percorso →</ButtonLink>
                {!archived && <ButtonLink size="sm" variant="ghost" href={`/docente/corsi/preventivi/nuovo?corso=${t.id}`}>Preventivo</ButtonLink>}
              </div>
            </article>
          );
        })}
      </div>

      <SectionHead title="Edizioni e iscrizioni" action={<Link href="/docente/corsi/edizioni/nuova" className="text-[13px] font-semibold text-wine">+ Nuova edizione</Link>} />
      {editions.length ? (
        <Table head={["Edizione", "Tipologia", "Avvio", "Lezioni", "Allieve", "Stato", ""]}>
          {editions.map((e) => {
            const held = e.lessons.filter((l) => l.date && l.date < now).length;
            return (
              <tr key={e.id}>
                <Td>
                  <Link href={`/docente/corsi/${e.id}`} className="font-bold hover:text-wine">{e.title}</Link>
                  <span className="block text-xs text-muted">{e._count.enrollments > 1 ? "Gruppo" : "Individuale"}</span>
                </Td>
                <Td>{e.courseType.title}</Td>
                <Td>{fmtDate(e.startDate ?? e.lessons.map((l) => l.date).filter(Boolean).sort((a, b) => +a! - +b!)[0])}</Td>
                <Td>{held} / {e.lessons.length}</Td>
                <Td>{e._count.enrollments}</Td>
                <Td><Badge tone={statusTone(e.status)}>{EDITION_STATUS_LABELS[e.status]}</Badge></Td>
                <Td className="text-right"><ButtonLink size="sm" variant="secondary" href={`/docente/corsi/${e.id}`}>Apri →</ButtonLink></Td>
              </tr>
            );
          })}
        </Table>
      ) : <Empty icon="calendar">Nessuna edizione. <Link className="text-wine underline" href="/docente/corsi/edizioni/nuova">Creane una</Link> oppure avvia un percorso da un preventivo accettato.</Empty>}
    </>
  );
}
