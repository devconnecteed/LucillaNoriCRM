import "server-only";
import { db } from "./db";
import { dimensionLabels, dimensionValues } from "./questionnaire/logic";
import { parseContent } from "./questionnaire/schema";

export type ProgressColumn = { responseId: string; title: string; date: Date; audience: string };
export type ProgressRow = { key: string; label: string; source: "self" | "teacher"; values: (number | null)[] };

/**
 * Andamento per dimensione nel tempo (spec §8). Si confrontano solo domande con la stessa chiave
 * `dimension` (= stesso significato); autovalutazione e competenze osservate restano righe distinte.
 * Con `publishedOnly` mostra solo ciò che la docente ha reso visibile all'allieva.
 */
export async function loadProgress(studentId: string, opts: { publishedOnly?: boolean; enrollmentId?: string } = {}) {
  const responses = await db.response.findMany({
    where: {
      status: "SUBMITTED",
      ...(opts.publishedOnly ? { published: true } : {}),
      assignment: { enrollment: { studentId, ...(opts.enrollmentId ? { id: opts.enrollmentId } : {}) } },
    },
    include: { assignment: { include: { version: { include: { template: true } } } } },
    orderBy: { submittedAt: "asc" },
  });

  const columns: ProgressColumn[] = [];
  const rows = new Map<string, ProgressRow>();
  responses.forEach((r) => {
    const content = parseContent(r.assignment.version.content);
    const values = dimensionValues(content, r.answers as Record<string, never>);
    if (!Object.keys(values).length) return;
    const col = columns.length;
    const audience = r.assignment.version.template.audience;
    columns.push({ responseId: r.id, title: r.assignment.version.template.title, date: r.submittedAt!, audience });
    const labels = dimensionLabels(content);
    for (const [key, v] of Object.entries(values)) {
      if (!rows.has(key)) rows.set(key, { key, label: labels[key] ?? key, source: audience === "TEACHER" ? "teacher" : "self", values: [] });
      rows.get(key)!.values[col] = v;
    }
  });
  // Righe confrontabili: almeno due rilevazioni
  const comparable = [...rows.values()]
    .filter((r) => r.values.filter((v) => typeof v === "number").length >= 2)
    .map((r) => ({ ...r, values: columns.map((_, i) => r.values[i] ?? null) }));
  return { columns, rows: comparable };
}
