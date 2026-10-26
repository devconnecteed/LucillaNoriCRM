// Seed di sviluppo: utenti di prova, tipologie corso, libreria modelli e un percorso demo FITTIZIO.
// Non inserire mai qui dati reali di allieve (spec §13).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { LIBRARY } from "./library";
import { contentSchema } from "../src/lib/questionnaire/schema";

const db = new PrismaClient();

/** Lezioni demo settimanali alle 10:30, a partire da domani. */
function lessonDate(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + (n - 1) * 7);
  d.setHours(10, 30, 0, 0);
  return d;
}
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "LnDemo2026!";

async function main() {
  // Gli utenti demo hanno una password nota: mai in produzione (usare scripts/crea-utente.ts)
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1")
    throw new Error("Seed demo bloccato in produzione. Per creare utenti reali: npx tsx scripts/crea-utente.ts");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await db.user.upsert({
    where: { email: "admin@ln.local" },
    update: {},
    create: { email: "admin@ln.local", name: "Amministratore", role: "ADMIN", passwordHash },
  });
  const teacher = await db.user.upsert({
    where: { email: "docente@ln.local" },
    update: {},
    create: { email: "docente@ln.local", name: "Docente LN", role: "TEACHER", passwordHash },
  });

  const courseDefs = [
    { slug: "stile", title: "Stile e Portamento", category: "Portamento", durationLessons: 4, durationHours: 4, mode: "BOTH",
      objectives: "Postura, camminata, gestione di braccia e sguardo, sicurezza sui tacchi e presenza." },
    { slug: "concorso", title: "Moda / Concorso", category: "Moda", durationLessons: 6, durationHours: 6, mode: "BOTH",
      objectives: "Camminata in passerella, stop, giri, pose, ingresso e saluto, abito da sera, intervista." },
    { slug: "sposa", title: "Portamento Sposa", category: "Sposa", durationLessons: 3, durationHours: 3, mode: "INDIVIDUAL",
      objectives: "Ingresso, gestione di strascico, velo e bouquet, equilibrio sui tacchi, emozione e posa per le foto." },
  ];
  const courses: Record<string, string> = {};
  for (const c of courseDefs) {
    const ct = await db.courseType.upsert({ where: { slug: c.slug }, update: {}, create: c });
    courses[c.slug] = ct.id;
  }

  for (const t of LIBRARY) {
    if (await db.questionnaireTemplate.findFirst({ where: { sourceFile: t.sourceFile, title: t.title } })) continue;
    const tpl = await db.questionnaireTemplate.create({
      data: {
        title: t.title, description: t.description, phase: t.phase, audience: t.audience,
        courseTypeId: courses[t.course], status: "PUBLISHED", sourceFile: t.sourceFile,
      },
    });
    for (const [i, content] of t.versions.entries()) {
      await db.templateVersion.create({
        data: {
          templateId: tpl.id, version: i + 1, content: contentSchema.parse(content),
          status: "PUBLISHED", publishedAt: new Date(), authorId: admin.id,
        },
      });
    }
  }

  // Percorso demo fittizio
  const demoEmail = "allieva.demo@ln.local";
  if (!(await db.user.findUnique({ where: { email: demoEmail } }))) {
    const u = await db.user.create({ data: { email: demoEmail, name: "Allieva Demo", role: "STUDENT", passwordHash } });
    const student = await db.student.create({
      data: {
        userId: u.id, teacherId: teacher.id, firstName: "Allieva", lastName: "Demo", email: demoEmail,
        goals: "Sentirsi più sicura agli eventi", leadSource: "Instagram",
        consents: { create: { type: "PRIVACY", granted: true, recordedById: teacher.id } },
      },
    });
    const edition = await db.courseEdition.create({
      data: {
        courseTypeId: courses.stile, teacherId: teacher.id, title: "Stile e Portamento · Demo", status: "RUNNING",
        startDate: new Date(), minAttendancePct: 75,
        lessons: { create: [1, 2, 3, 4].map((n) => ({ number: n, durationMin: 60, topic: ["Postura e camminata", "Braccia, mani e sguardo", "Tacchi e giri", "Ripasso e presentazione"][n - 1], date: lessonDate(n) })) },
      },
    });
    const enrollment = await db.enrollment.create({ data: { studentId: student.id, editionId: edition.id, status: "IN_PROGRESS" } });
    const initial = await db.templateVersion.findFirst({ where: { template: { title: "Test di autovalutazione iniziale" } }, orderBy: { version: "desc" } });
    if (initial)
      await db.assignment.create({ data: { versionId: initial.id, enrollmentId: enrollment.id, assignedById: teacher.id } });
  }

  console.log(`Seed completato. Accessi di prova (password: ${DEMO_PASSWORD}):`);
  console.log("  admin@ln.local · docente@ln.local · allieva.demo@ln.local");
}

main().finally(() => db.$disconnect());
