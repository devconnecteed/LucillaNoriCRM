/** Punteggio in formato italiano: 4,5 / 5 (fino a due decimali, senza zeri inutili). */
export function fmtScore(score: number | null | undefined, max: number | null | undefined) {
  const n = (v: number) => v.toLocaleString("it-IT", { maximumFractionDigits: 2 });
  return score == null || max == null ? "—" : `${n(score)}/${n(max)}`;
}
