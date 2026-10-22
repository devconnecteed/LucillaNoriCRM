import "server-only";
import { db } from "./db";

/** Verifica requisiti per l'attestato (spec §9, §12): presenze ≥ soglia dell'edizione e iscrizione completata. */
export async function certificateRequirements(enrollmentId: string) {
  const en = await db.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    include: {
      edition: { include: { lessons: true, courseType: true } },
      attendances: { include: { lesson: true } },
      student: true,
      certificates: { where: { revokedAt: null } },
    },
  });
  const total = en.edition.lessons.length;
  const attended = en.attendances.filter((a) => a.present);
  const pct = total ? Math.round((attended.length / total) * 100) : 0;
  const hours = attended.reduce((h, a) => h + a.lesson.durationMin, 0) / 60;
  const checks = [
    { label: `Presenze ${attended.length}/${total} (${pct}%) – soglia ${en.edition.minAttendancePct}%`, ok: total > 0 && pct >= en.edition.minAttendancePct },
    { label: "Percorso segnato come completato", ok: en.status === "COMPLETED" },
    { label: "Tipologia di corso con attestato abilitato", ok: en.edition.courseType.certificateEnabled },
  ];
  const dates = attended.map((a) => a.lesson.date).filter((d): d is Date => !!d).sort((a, b) => +a - +b);
  return {
    enrollment: en,
    checks,
    ok: checks.every((c) => c.ok),
    hours,
    periodFrom: dates[0] ?? en.edition.startDate,
    periodTo: dates.at(-1) ?? en.edition.endDate,
    active: en.certificates[0] ?? null,
  };
}

export async function nextCertificateNumber() {
  const year = new Date().getFullYear();
  const count = await db.certificate.count({ where: { number: { startsWith: `LN-${year}-` } } });
  return `LN-${year}-${String(count + 1).padStart(4, "0")}`;
}
