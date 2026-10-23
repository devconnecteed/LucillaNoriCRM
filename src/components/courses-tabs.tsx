import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { Tabs } from "./ui";

/** Navigazione interna di "Percorsi e corsi": il catalogo e il processo commerciale (preventivi) stanno insieme. */
export async function CoursesTabs({ user, active }: { user: CurrentUser; active: "catalogo" | "preventivi" }) {
  const open = await db.quote.count({
    where: { ...(user.role === "ADMIN" ? {} : { teacherId: user.id }), OR: [{ status: "SENT" }, { status: "ACCEPTED", editionId: null }] },
  });
  return (
    <Tabs
      active={active}
      items={[
        { value: "catalogo", label: "Catalogo ed edizioni", href: "/docente/corsi" },
        {
          value: "preventivi",
          href: "/docente/corsi/preventivi",
          label: open ? <>Preventivi <span className="ml-1 rounded-full bg-blush px-1.5 text-[10px] text-wine">{open}</span></> : "Preventivi",
        },
      ]}
    />
  );
}
