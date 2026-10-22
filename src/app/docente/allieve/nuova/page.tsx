import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { createStudent } from "@/server/students";
import { StudentForm } from "@/components/student-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nuova allieva" };

export default async function NewStudentPage() {
  const user = await requireStaff();
  const teachers = user.role === "ADMIN" ? await db.user.findMany({ where: { role: { in: ["TEACHER", "ADMIN"] }, active: true }, select: { id: true, name: true } }) : undefined;
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Persone e percorsi" title="Nuova allieva" subtitle="Crea il profilo. Potrai inviare l’accesso all’area riservata e iscriverla a un percorso subito dopo." />
      <StudentForm action={createStudent} teachers={teachers} cancelHref="/docente/allieve" />
    </div>
  );
}
