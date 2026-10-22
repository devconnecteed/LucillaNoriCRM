import { isAnswered } from "./logic";
import type { Answers, InfoItem, Item, QuestionnaireContent } from "./types";

/**
 * Una schermata della compilazione mobile: una domanda alla volta.
 * I testi informativi che precedono una domanda le restano attaccati; quelli in fondo
 * a una sezione (es. istruzioni degli esercizi) diventano una schermata "info" a sé.
 */
export type Step = {
  sectionIdx: number;
  /** Prima schermata della sezione: mostra la descrizione della sezione. */
  firstOfSection: boolean;
  infos: InfoItem[];
  item: Exclude<Item, InfoItem> | null;
};

export function buildSteps(content: QuestionnaireContent): Step[] {
  const steps: Step[] = [];
  content.sections.forEach((s, sectionIdx) => {
    let infos: InfoItem[] = [];
    let first = true;
    for (const item of s.items) {
      if (item.type === "info") {
        infos.push(item);
        continue;
      }
      steps.push({ sectionIdx, firstOfSection: first, infos, item });
      infos = [];
      first = false;
    }
    if (infos.length || first) steps.push({ sectionIdx, firstOfSection: first, infos, item: null });
  });
  return steps;
}

/** Schermata da cui riprendere: la prima domanda senza risposta, oppure il riepilogo (= steps.length). */
export function resumeIndex(steps: Step[], answers: Answers) {
  const answeredAny = steps.some((s) => s.item && isAnswered(s.item, answers[s.item.id]));
  if (!answeredAny) return 0;
  const i = steps.findIndex((s) => s.item && !isAnswered(s.item, answers[s.item.id]));
  return i === -1 ? steps.length : i;
}

/** Le domande a scelta singola e le scale passano da sole alla successiva dopo la risposta. */
export const autoAdvances = (item: Item | null) => !!item && (item.type === "single" || item.type === "scale");
