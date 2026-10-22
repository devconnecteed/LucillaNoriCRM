import { requireStaff } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { SideNav } from "@/components/nav";
import { Logo } from "@/components/ui";

const NAV = [
  { href: "/docente", label: "Dashboard" },
  { href: "/docente/allieve", label: "Allieve" },
  { href: "/docente/corsi", label: "Corsi" },
  { href: "/docente/questionari", label: "Questionari" },
  { href: "/docente/valutazioni", label: "Valutazioni" },
  { href: "/docente/attestati", label: "Attestati" },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="border-b border-stone-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:py-6">
        <div className="mb-3 lg:mb-8"><Logo small /></div>
        <SideNav items={NAV} />
        <div className="mt-4 border-t border-stone-100 pt-4 text-xs text-stone-500 lg:absolute lg:bottom-6 lg:left-4 lg:right-4">
          <div className="font-medium text-stone-700">{user.name}</div>
          <div>{user.role === "ADMIN" ? "Amministratore" : "Docente"}</div>
          <form action={logout}><button className="mt-2 text-ln-700 underline">Esci</button></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}
