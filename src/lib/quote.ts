// Calcolo preventivi: funzione pura usata sia dalla calcolatrice (client) sia dal server,
// che ricalcola sempre i totali senza fidarsi di quelli inviati dal browser.

export type QuoteLine = { label: string; qty: number; unitCents: number };

export type QuoteInput = { lines: QuoteLine[]; discountPct: number; vatRate: number };

export function computeQuote({ lines, discountPct, vatRate }: QuoteInput) {
  const subtotalCents = lines.reduce((s, l) => s + Math.round(l.qty * l.unitCents), 0);
  const discountCents = Math.round((subtotalCents * clamp(discountPct, 0, 100)) / 100);
  const taxable = subtotalCents - discountCents;
  const vatCents = Math.round((taxable * clamp(vatRate, 0, 100)) / 100);
  return { subtotalCents, discountCents, vatCents, totalCents: taxable + vatCents };
}

/** Riga principale proposta dal listino della tipologia: pacchetto se definito, altrimenti prezzo × lezioni. */
export function courseLine(
  course: { title: string; packagePriceCents: number | null; lessonPriceCents: number | null; durationLessons: number | null },
  lessons: number,
): QuoteLine {
  if (course.packagePriceCents != null && lessons === course.durationLessons)
    return { label: `Percorso “${course.title}” – pacchetto ${lessons} lezioni`, qty: 1, unitCents: course.packagePriceCents };
  return { label: `Percorso “${course.title}” – lezione individuale`, qty: lessons, unitCents: course.lessonPriceCents ?? 0 };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0));

export const euro = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

/** "12,50" | "12.50" | "12" → 1250 centesimi; null se non valido. */
export function parseEuro(v: string | null | undefined): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).trim().replace(/\./g, (m, i, s) => (s.includes(",") ? "" : m)).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  SENT: "Inviato",
  ACCEPTED: "Accettato",
  DECLINED: "Rifiutato",
  CANCELLED: "Annullato",
  EXPIRED: "Scaduto",
};

/** Scadenza calcolata in lettura (fine giornata di validUntil). */
export function quoteEffectiveStatus(q: { status: string; validUntil: Date }) {
  const end = new Date(q.validUntil);
  end.setHours(23, 59, 59, 999);
  return q.status === "SENT" && end < new Date() ? "EXPIRED" : q.status;
}
