import type { AnswerValue, Item } from "@/lib/questionnaire/types";
import { isScoredItem } from "@/lib/questionnaire/logic";

const none = <span className="font-normal italic text-[#aaa09d]">non risposto</span>;

/** Rappresentazione testuale di una risposta. Usabile sia lato server che client. */
export function AnswerDisplay({ item, value }: { item: Item; value: AnswerValue | undefined }) {
  if (value === undefined || value === null || value === "") return none;
  switch (item.type) {
    case "text":
      return <span className="whitespace-pre-wrap">{String(value)}</span>;
    case "date":
      return <>{new Date(String(value)).toLocaleDateString("it-IT")}</>;
    case "single":
      return <>{item.options.find((o) => o.id === value)?.label ?? String(value)}</>;
    case "multiple":
      return Array.isArray(value) && value.length
        ? <>{item.options.filter((o) => (value as string[]).includes(o.id)).map((o) => o.label).join(", ")}</>
        : none;
    case "scale":
      return <>{String(value)} / {item.max}</>;
    case "rubric": {
      const obj = value as Record<string, number>;
      return (
        <ul className="mt-1 grid gap-1 sm:grid-cols-2">
          {item.criteria.map((c) => <li key={c.id}>{c.label}: <b>{obj[c.id] ?? "–"}</b>/{item.max}</li>)}
        </ul>
      );
    }
    case "diary": {
      const obj = value as Record<string, string[]>;
      return (
        <ul className="mt-1 space-y-0.5">
          {item.rows.map((r) => <li key={r.id}>{r.label}: {obj[r.id]?.length ? `${obj[r.id].join(", ")} (${obj[r.id].length}/${item.days.length})` : "—"}</li>)}
        </ul>
      );
    }
    case "info":
      return null;
  }
}

/** Esito di un quesito di quiz, per la vista correzione. */
export function CorrectnessHint({ item, value }: { item: Item; value: AnswerValue | undefined }) {
  if (!isScoredItem(item)) return null;
  let ok = false;
  let correctLabel = "";
  if (item.type === "single") {
    ok = value === item.correct;
    correctLabel = item.options.find((o) => o.id === item.correct)?.label ?? "";
  } else if (item.type === "multiple") {
    const v = new Set(Array.isArray(value) ? value : []);
    const c = item.correct ?? [];
    ok = v.size === c.length && c.every((x) => v.has(x));
    correctLabel = item.options.filter((o) => c.includes(o.id)).map((o) => o.label).join(", ");
  }
  return ok ? (
    <span className="text-xs font-medium text-ok">✓ Corretta</span>
  ) : (
    <span className="text-xs text-[#a4434a]">✗ Risposta corretta: {correctLabel}</span>
  );
}
