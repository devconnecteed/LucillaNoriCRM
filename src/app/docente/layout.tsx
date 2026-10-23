import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { enrollmentWhereForStaff } from "@/lib/guards";
import { logout } from "@/app/auth-actions";
import { AppShell, Breadcrumb, type NavGroup } from "@/components/nav";
import { Icon } from "@/components/icons";
import { Initials } from "@/components/ui";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const scope = enrollmentWhereForStaff(user);
  const [toReview, acceptedQuotes] = await Promise.all([
    db.response.count({ where: { status: "SUBMITTED", published: false, assignment: { enrollment: scope } } }),
    db.quote.count({ where: { ...(user.role === "ADMIN" ? {} : { teacherId: user.id }), status: "ACCEPTED", editionId: null } }),
  ]);

  const groups: NavGroup[] = [
    {
      caption: "Workspace",
      items: [
        { href: "/docente", label: "Panoramica", icon: "dashboard" },
        { href: "/docente/allieve", label: "Allieve", icon: "users" },
        // Include i preventivi (tab interno): il contatore segnala quelli accettati da avviare
        { href: "/docente/corsi", label: "Percorsi e corsi", icon: "book", count: acceptedQuotes },
        { href: "/docente/calendario", label: "Calendario", icon: "calendar" },
      ],
    },
    {
      caption: "Gestione didattica",
      items: [
        { href: "/docente/questionari", label: "Questionari", icon: "clipboard" },
        { href: "/docente/valutazioni", label: "Valutazioni", icon: "chart", count: toReview },
        { href: "/docente/attestati", label: "Attestati", icon: "award" },
      ],
    },
  ];

  const today = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <AppShell
      groups={groups}
      footer={
        <div className="flex items-center gap-2.5 px-1">
          <Initials name={user.name} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{user.name}</div>
            <div className="text-[11px] text-muted">{user.role === "ADMIN" ? "Amministratrice" : "Docente"}</div>
          </div>
          <form action={logout}>
            <button aria-label="Esci" title="Esci" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-blush hover:text-wine">
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </form>
        </div>
      }
    >
      <header className="sticky top-0 z-20 hidden h-[72px] items-center justify-between gap-6 border-b border-line bg-paper/90 px-8 backdrop-blur-md lg:flex xl:px-12">
        <Breadcrumb />
        <div className="flex items-center gap-3">
          <form action="/docente/cerca" role="search" className="flex w-64 items-center gap-2 rounded-[9px] border border-line bg-white px-3 py-2 text-xs text-[#9c9390] focus-within:border-[#b78693]">
            <Icon name="search" className="h-4 w-4" />
            <input name="q" aria-label="Cerca allieve, corsi, questionari" placeholder="Cerca allieve, corsi, test…" className="w-full bg-transparent text-ink outline-none placeholder:text-[#9c9390]" />
          </form>
          <span className="text-[11px] capitalize text-muted">{today}</span>
        </div>
      </header>
      <main className="view-in mx-auto max-w-[1550px] px-4 pb-16 pt-6 sm:px-7 lg:px-8 lg:pt-10 xl:px-12">{children}</main>
    </AppShell>
  );
}
