import { test } from "node:test";
import assert from "node:assert/strict";
import { LIBRARY } from "../prisma/library";
import { autoAdvances, buildSteps, resumeIndex } from "../src/lib/questionnaire/steps";

const latest = (k: string) => LIBRARY.find((t) => t.key === k)!.versions.at(-1)!;

test("una schermata per domanda; le istruzioni restano attaccate o diventano una schermata a sé", () => {
  const steps = buildSteps(latest("esercizi-postura-giri"));
  // sezione 1: solo 4 istruzioni → 1 schermata info; sezione 2: diario + note
  assert.equal(steps.length, 3);
  assert.equal(steps[0].item, null);
  assert.equal(steps[0].infos.length, 4);
  assert.equal(steps[1].item?.type, "diary");
  assert.ok(steps[1].firstOfSection);
});

test("il test di fine lezione diventa 23 schermate, come le 23 domande del modulo", () => {
  assert.equal(buildSteps(latest("ln-fine-lezione")).length, 23);
});

test("si riprende dalla prima domanda senza risposta, o dal riepilogo se tutto è compilato", () => {
  const c = latest("ln-autovalutazione");
  const steps = buildSteps(c);
  assert.equal(resumeIndex(steps, {}), 0);
  assert.equal(resumeIndex(steps, { q1: 4, q2: 3 }), 2);
  const all = { q1: 4, q2: 4, q3: 5, q4: 4, q5: 5, q6: 5, q7: "Foto", q8: "x", q9: "y", q10: "3" };
  assert.equal(resumeIndex(steps, all), steps.length);
});

test("avanzamento automatico solo per scelta singola e scale", () => {
  const items = buildSteps(latest("ln-fine-lezione")).map((s) => s.item!);
  assert.ok(autoAdvances(items.find((i) => i.type === "scale")!));
  assert.ok(autoAdvances(items.find((i) => i.type === "single")!));
  assert.ok(!autoAdvances(items.find((i) => i.type === "text")!));
});
