import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, studentScope, editionScope } from "@/lib/auth";
import { euro } from "@/lib/quote";
import { Icon, type IconName } from "@/components/icons";
import { Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Ricerca" };

type Hit = { href: string; title: string; detail: string };

/** Ricerca globale (barra superiore): allieve, edizioni, questionari e preventivi visibili all'utente. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireStaff();
  const q = ((await searchParams).q ?? "").trim();

  let groups: { title: string; icon: IconName; hits: Hit[] }[] = [];
  if (q.length >= 2) {
    const [students, editions, templates, quotes] = await Promise.all([
      db.student.findMany({
        where: { ...studentScope(user), OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] },
        take: 10,
      }),
      db.courseEdition.findMany({ where: { ...editionScope(user), OR: [{ title: { contains: q } }, { courseType: { title: { contains: q } } }] }, include: { courseType: true }, take: 10 }),
      db.questionnaireTemplate.findMany({ where: { OR: [{ title: { contains: q } }, { description: { contains: q } }] }, include: { courseType: true }, take: 10 }),
      db.quote.findMany({
        where: { ...(user.role === "ADMIN" ? {} : { teacherId: user.id }), OR: [{ number: { contains: q } }, { prospectFirstName: { contains: q } }, { prospectLastName: { contains: q } }, { prospectEmail: { contains: q } }] },
        include: { courseType: true }, take: 10,
      }),
    ]);
    groups = [
      { title: "Allieve", icon: "users" as const, hits: students.map((s) => ({ href: `/docente/allieve/${s.id}`, title: `${s.firstName} ${s.lastName}`, detail: s.email })) },
      { title: "Percorsi", icon: "book" as const, hits: editions.map((e) => ({ href: `/docente/corsi/${e.id}`, title: e.title, detail: e.courseType.title })) },
      { title: "Questionari", icon: "clipboard" as const, hits: templates.map((t) => ({ href: `/docente/questionari/${t.id}`, title: t.title, detail: t.courseType?.title ?? "Tutti i corsi" })) },
      { title: "Preventivi", icon: "file" as const, hits: quotes.map((x) => ({ href: `/docente/corsi/preventivi/${x.id}`, title: `${x.number} · ${x.prospectFirstName} ${x.prospectLastName}`, detail: `${x.courseType.title} · ${euro(x.totalCents)}` })) },
    ].filter((g) => g.hits.length);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Ricerca" title={q ? `Risultati per “${q}”` : "Cerca nello studio"} />
      <form role="search" className="relative mb-6">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c9390]" />
        <input className="input !pl-10" name="q" defaultValue={q} autoFocus placeholder="Nome, email, corso, numero di preventivo…" aria-label="Cerca" />
      </form>
      {q.length < 2 ? <Empty icon="search">Scrivi almeno due caratteri.</Empty>
        : groups.length ? (
          <div className="space-y-5">
            {groups.map((g) => (
              <Card key={g.title}>
                <h2 className="mb-2 flex items-center gap-2 font-serif text-[22px] text-wine-dark"><Icon name={g.icon} className="h-5 w-5 text-ln-400" />{g.title}</h2>
                <ul className="divide-y divide-[#f2edeb]">
                  {g.hits.map((h) => (
                    <li key={h.href}>
                      <Link href={h.href} className="flex items-center justify-between gap-3 py-3 text-[13px] hover:text-wine">
                        <span><b className="font-semibold">{h.title}</b><span className="block text-xs text-muted">{h.detail}</span></span>
                        <Icon name="chevron" className="h-4 w-4 text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        ) : <Empty icon="search">Nessun risultato per “{q}”.</Empty>}
    </div>
  );
}
