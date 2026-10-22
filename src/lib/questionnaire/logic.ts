import type { Answers, AnswerValue, Item, QuestionnaireContent } from "./types";

export function allItems(content: QuestionnaireContent): Item[] {
  return content.sections.flatMap((s) => s.items);
}

/** Un quesito è "di quiz" solo se ha una chiave corretta definita (spec §5: niente giusto/sbagliato di default). */
export function isScoredItem(item: Item): boolean {
  if (item.type === "single") return !!item.correct;
  if (item.type === "multiple") return !!item.correct && item.correct.length > 0;
  return false;
}

export function isQuiz(content: QuestionnaireContent): boolean {
  return allItems(content).some(isScoredItem);
}

export function isAnswered(item: Item, value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  switch (item.type) {
    case "text":
    case "date":
    case "single":
      return typeof value === "string" && value.trim() !== "";
    case "scale":
      return typeof value === "number";
    case "multiple":
      return Array.isArray(value) && value.length > 0;
    case "diary":
      return typeof value === "object" && !Array.isArray(value);
    case "rubric":
      return (
        typeof value === "object" &&
        !Array.isArray(value) &&
        item.criteria.every((c) => typeof (value as Record<string, unknown>)[c.id] === "number")
      );
    case "info":
      return true;
  }
}

export function missingRequired(content: QuestionnaireContent, answers: Answers): Item[] {
  return allItems(content).filter((i) => i.required && i.type !== "info" && !isAnswered(i, answers[i.id]));
}

export type ItemScore = { itemId: string; points: number; max: number; correct: boolean };

/**
 * Punteggio automatico. Le domande non risposte valgono 0 (criterio da validare, spec §12).
 * Multipla: "all_or_nothing" (default) oppure "partial" = (corrette scelte − errate scelte)/corrette, minimo 0.
 */
export function scoreAnswers(content: QuestionnaireContent, answers: Answers) {
  const details: ItemScore[] = [];
  for (const item of allItems(content)) {
    if (!isScoredItem(item)) continue;
    const max = item.type === "single" || item.type === "multiple" ? item.points ?? 1 : 0;
    const value = answers[item.id];
    let points = 0;
    if (item.type === "single") {
      points = value === item.correct ? max : 0;
    } else if (item.type === "multiple") {
      const chosen = new Set(Array.isArray(value) ? value : []);
      const correct = new Set(item.correct ?? []);
      const hits = [...chosen].filter((c) => correct.has(c)).length;
      const wrong = chosen.size - hits;
      if (item.scoring === "partial") {
        points = Math.max(0, ((hits - wrong) / correct.size) * max);
      } else {
        points = hits === correct.size && wrong === 0 ? max : 0;
      }
    }
    details.push({ itemId: item.id, points, max, correct: points === max });
  }
  const score = details.reduce((a, d) => a + d.points, 0);
  const maxScore = details.reduce((a, d) => a + d.max, 0);
  return { score, maxScore, details, percent: maxScore ? Math.round((score / maxScore) * 100) : null };
}

/** Valori numerici per dimensione (scale con `dimension`, rubriche con `dimensionPrefix`), per i confronti prima/dopo. */
export function dimensionValues(content: QuestionnaireContent, answers: Answers): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of allItems(content)) {
    const v = answers[item.id];
    if (item.type === "scale" && item.dimension && typeof v === "number") out[item.dimension] = v;
    if (item.type === "rubric" && item.dimensionPrefix && v && typeof v === "object" && !Array.isArray(v)) {
      for (const c of item.criteria) {
        const n = (v as Record<string, unknown>)[c.id];
        if (typeof n === "number") out[`${item.dimensionPrefix}.${c.id}`] = n;
      }
    }
  }
  return out;
}

/** Etichette leggibili per le dimensioni di un contenuto. */
export function dimensionLabels(content: QuestionnaireContent): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of allItems(content)) {
    if (item.type === "scale" && item.dimension) out[item.dimension] = item.label;
    if (item.type === "rubric" && item.dimensionPrefix)
      for (const c of item.criteria) out[`${item.dimensionPrefix}.${c.id}`] = c.label;
  }
  return out;
}

export function newId(prefix = "q"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Rimuove chiavi corrette e punteggi prima di inviare il contenuto al browser dell'allieva. */
export function stripAnswerKey(content: QuestionnaireContent): QuestionnaireContent {
  return {
    ...content,
    sections: content.sections.map((s) => ({
      ...s,
      items: s.items.map((i) => {
        if (i.type !== "single" && i.type !== "multiple") return i;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { correct, points, ...rest } = i;
        return rest as Item;
      }),
    })),
  };
}
