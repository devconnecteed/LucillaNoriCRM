// Struttura del contenuto di una TemplateVersion (spec §5).
// Una versione pubblicata è immutabile: le risposte (Response.answers) sono indicizzate per item.id.

export type Option = { id: string; label: string };

type ItemBase = {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
};

/** Risposta singola. Con `correct` diventa quesito di quiz con punteggio. */
export type SingleItem = ItemBase & {
  type: "single";
  options: Option[];
  correct?: string;
  points?: number;
};

/** Risposta multipla / checklist. Con `correct` è quesito di quiz (regola: tutto-o-niente o parziale). */
export type MultipleItem = ItemBase & {
  type: "multiple";
  options: Option[];
  correct?: string[];
  points?: number;
  scoring?: "all_or_nothing" | "partial";
};

/**
 * Scala 1–5 / Likert. Mai giusto/sbagliato.
 * `dimension`: chiave condivisa tra domande equivalenti (es. prima/dopo) per i confronti nel tempo.
 */
export type ScaleItem = ItemBase & {
  type: "scale";
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  dimension?: string;
};

export type TextItem = ItemBase & { type: "text"; long?: boolean };

/** Diario settimanale: righe (esercizi) × giorni. Valore: { [rowId]: string[] giorni } */
export type DiaryItem = ItemBase & {
  type: "diary";
  rows: Option[];
  days: string[];
};

/** Rubrica docente: voto per criterio + note. Valore: { [criterionId]: number } */
export type RubricItem = ItemBase & {
  type: "rubric";
  criteria: Option[];
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  dimensionPrefix?: string;
};

export type InfoItem = ItemBase & { type: "info" };
export type DateItem = ItemBase & { type: "date" };

export type Item =
  | SingleItem
  | MultipleItem
  | ScaleItem
  | TextItem
  | DiaryItem
  | RubricItem
  | InfoItem
  | DateItem;

export type ItemType = Item["type"];

export type Section = {
  id: string;
  title: string;
  description?: string;
  items: Item[];
};

export type QuestionnaireContent = {
  intro?: string;
  outro?: string;
  sections: Section[];
};

export type AnswerValue = string | string[] | number | Record<string, number | string[]> | null;
export type Answers = Record<string, AnswerValue>;

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  single: "Risposta singola",
  multiple: "Risposta multipla / checklist",
  scale: "Scala 1–5",
  text: "Testo libero",
  diary: "Diario settimanale",
  rubric: "Rubrica docente",
  info: "Testo informativo",
  date: "Data",
};

export const WEEK_DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
