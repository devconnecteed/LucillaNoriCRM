import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { Icon } from "@/components/icons";
import { Initials, Logo } from "@/components/ui";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("STUDENT");
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/allieva" aria-label="La mia area"><Logo small /></Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted sm:inline">{user.name}</span>
            <Initials name={user.name} />
            <form action={logout}>
              <button aria-label="Esci" title="Esci" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-blush hover:text-wine">
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="view-in mx-auto max-w-3xl px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}
