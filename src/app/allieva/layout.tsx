import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { Logo } from "@/components/ui";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("STUDENT");
  return (
    <div className="min-h-dvh">
      <header className="border-b border-ln-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/allieva" aria-label="Home"><Logo small /></Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-stone-600 sm:inline">{user.name}</span>
            <form action={logout}><button className="text-ln-700 underline">Esci</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
