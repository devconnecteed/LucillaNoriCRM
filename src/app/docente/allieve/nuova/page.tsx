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
      <PageHeader title="Nuova allieva" subtitle="Dopo la creazione potrai inviarle l’invito all’area riservata e iscriverla a un corso." />
      <StudentForm action={createStudent} teachers={teachers} />
    </div>
  );
}
