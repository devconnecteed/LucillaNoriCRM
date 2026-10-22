import { test } from "node:test";
import assert from "node:assert/strict";
import { computeQuote, courseLine, parseEuro, quoteEffectiveStatus } from "../src/lib/quote";

test("totale con sconto e IVA, arrotondato al centesimo", () => {
  const r = computeQuote({
    lines: [{ label: "Pacchetto", qty: 1, unitCents: 35000 }, { label: "Lezione extra", qty: 2, unitCents: 9000 }],
    discountPct: 10,
    vatRate: 22,
  });
  assert.deepEqual(r, { subtotalCents: 53000, discountCents: 5300, vatCents: 10494, totalCents: 58194 });
});

test("senza IVA (forfettario) e sconto fuori range limitato", () => {
  const r = computeQuote({ lines: [{ label: "x", qty: 3, unitCents: 3333 }], discountPct: 150, vatRate: 0 });
  assert.equal(r.subtotalCents, 9999);
  assert.equal(r.totalCents, 0);
});

test("parseEuro accetta formati italiani e rifiuta valori non validi", () => {
  assert.equal(parseEuro("350"), 35000);
  assert.equal(parseEuro("350,50"), 35050);
  assert.equal(parseEuro("12.5"), 1250);
  assert.equal(parseEuro("1.250,00"), 125000);
  assert.equal(parseEuro(""), null);
  assert.equal(parseEuro("abc"), null);
  assert.equal(parseEuro("-5"), null);
});

test("riga da listino: pacchetto se le lezioni coincidono, altrimenti prezzo × lezioni", () => {
  const c = { title: "Sposa", packagePriceCents: 30000, lessonPriceCents: 12000, durationLessons: 3 };
  assert.deepEqual(courseLine(c, 3), { label: "Percorso “Sposa” – pacchetto 3 lezioni", qty: 1, unitCents: 30000 });
  assert.deepEqual(courseLine(c, 5), { label: "Percorso “Sposa” – lezione individuale", qty: 5, unitCents: 12000 });
});

test("preventivo inviato oltre la validità risulta scaduto", () => {
  const yesterday = new Date(Date.now() - 86400_000);
  assert.equal(quoteEffectiveStatus({ status: "SENT", validUntil: yesterday }), "EXPIRED");
  assert.equal(quoteEffectiveStatus({ status: "SENT", validUntil: new Date() }), "SENT");
  assert.equal(quoteEffectiveStatus({ status: "ACCEPTED", validUntil: yesterday }), "ACCEPTED");
});
