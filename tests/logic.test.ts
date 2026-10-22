import { test } from "node:test";
import assert from "node:assert/strict";
import { LIBRARY } from "../prisma/library";
import { contentSchema } from "../src/lib/questionnaire/schema";
import { dimensionValues, isQuiz, missingRequired, scoreAnswers, stripAnswerKey } from "../src/lib/questionnaire/logic";
import type { QuestionnaireContent } from "../src/lib/questionnaire/types";

const byKey = (k: string) => LIBRARY.find((t) => t.key === k)!;
const latest = (k: string) => byKey(k).versions.at(-1)!;

test("tutti i modelli della libreria superano la validazione", () => {
  for (const t of LIBRARY) for (const v of t.versions) assert.doesNotThrow(() => contentSchema.parse(v), t.key);
});

test("id delle domande univoci in ogni versione", () => {
  for (const t of LIBRARY)
    for (const v of t.versions) {
      const ids = v.sections.flatMap((s) => s.items.map((i) => i.id));
      assert.equal(new Set(ids).size, ids.length, t.key);
    }
});

test("la libreria non contiene i dati compilati presenti negli allegati", () => {
  const all = JSON.stringify(LIBRARY);
  for (const s of ["Gambardella", "22/09/2026", "leggiadro", "palestra", "7/7", "15/10/26"]) assert.ok(!all.includes(s), s);
});

test("solo il quiz ha punteggio; autovalutazioni senza giusto/sbagliato", () => {
  assert.equal(isQuiz(latest("quiz-postura-giri")), true);
  for (const k of ["ln-autovalutazione", "ln-fine-lezione", "concorso-fine-lezione", "sposa-valutazione", "sposa-prima", "sposa-dopo"])
    assert.equal(isQuiz(latest(k)), false, k);
});

test("punteggio quiz: 5 risposte corrette = 5/5, risposte vuote = 0", () => {
  const quiz = latest("quiz-postura-giri");
  const perfect = { q1: "o2", q2: "o2", q3: "o3", q4: "o2", q5: "o3" };
  assert.deepEqual([scoreAnswers(quiz, perfect).score, scoreAnswers(quiz, perfect).maxScore], [5, 5]);
  const partial = { q1: "o2", q2: "o1" };
  assert.equal(scoreAnswers(quiz, partial).score, 1);
  assert.equal(scoreAnswers(quiz, partial).percent, 20);
});

test("multipla: tutto-o-niente e parziale", () => {
  const c: QuestionnaireContent = {
    sections: [{ id: "s", title: "", items: [
      { id: "a", type: "multiple", label: "", options: [{ id: "x", label: "" }, { id: "y", label: "" }, { id: "z", label: "" }], correct: ["x", "y"], points: 2 },
      { id: "b", type: "multiple", label: "", options: [{ id: "x", label: "" }, { id: "y", label: "" }, { id: "z", label: "" }], correct: ["x", "y"], points: 2, scoring: "partial" },
    ] }],
  };
  const r = scoreAnswers(c, { a: ["x"], b: ["x"] });
  assert.equal(r.details[0].points, 0);
  assert.equal(r.details[1].points, 1);
  assert.equal(scoreAnswers(c, { b: ["x", "z"] }).details[1].points, 0);
});

test("stripAnswerKey rimuove chiavi corrette e punti", () => {
  const stripped = JSON.stringify(stripAnswerKey(latest("quiz-postura-giri")));
  assert.ok(!stripped.includes('"correct"'));
  assert.ok(!stripped.includes('"points"'));
});

test("obbligatorie mancanti", () => {
  const c = latest("ln-autovalutazione");
  assert.equal(missingRequired(c, {}).length, 6); // le 6 scale; le domande aperte sono facoltative
  assert.equal(missingRequired(c, { q1: 4, q2: 4, q3: 5, q4: 4, q5: 5, q6: 5 }).length, 0);
});

test("confronto prima/dopo solo su domande equivalenti", () => {
  const prima = dimensionValues(latest("sposa-prima"), { p1: 2, p3: 4 });
  const dopo = dimensionValues(latest("sposa-dopo"), { p1: 4, p4: 5 });
  const common = Object.keys(prima).filter((k) => k in dopo);
  assert.deepEqual(common, ["sposa_tacchi"]); // “ansia ingresso” e “pronta” non sono confrontabili
});

test("rubrica docente separata dall'autovalutazione", () => {
  const v = dimensionValues(latest("sposa-valutazione"), { r1: { postura: 3, camminata: 4 } });
  assert.ok(Object.keys(v).every((k) => k.startsWith("sposa_rubrica.") || k === "sposa_sicura_vs_inizio"));
});
