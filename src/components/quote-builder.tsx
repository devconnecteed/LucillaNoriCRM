"use client";

import { useMemo, useState } from "react";
import type { ActionState } from "@/server/students";
import { centsToInput, computeQuote, courseLine, euro, parseEuro, type QuoteLine } from "@/lib/quote";
import { ActionForm, FormMessage } from "./action-form";
import { Button, Card, Field, cx } from "./ui";

export type QuoteCourse = { id: string; title: string; durationLessons: number | null; packagePriceCents: number | null; lessonPriceCents: number | null };
export type QuoteStudent = { id: string; firstName: string; lastName: string; email: string; phone: string | null };
export type QuoteInitial = {
  courseTypeId: string; studentId: string | null;
  prospectFirstName: string; prospectLastName: string; prospectEmail: string; prospectPhone: string;
  lessons: number; lessonMinutes: number; lines: QuoteLine[]; discountPct: number; vatRate: number;
  validUntil: string; notes: string;
};

type Row = { label: string; qty: string; unit: string };
const toRow = (l: QuoteLine): Row => ({ label: l.label, qty: String(l.qty), unit: centsToInput(l.unitCents) });

/** Preventivatore: compone le voci dal listino del corso e mostra il totale in tempo reale. */
export function QuoteBuilder({ action, courses, students, initial }: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  courses: QuoteCourse[];
  students: QuoteStudent[];
  initial: QuoteInitial;
}) {
  const [courseId, setCourseId] = useState(initial.courseTypeId);
  const [lessons, setLessons] = useState(initial.lessons);
  const [rows, setRows] = useState<Row[]>(initial.lines.map(toRow));
  const [autoFirst, setAutoFirst] = useState(initial.lines.length <= 1);
  const [discount, setDiscount] = useState(String(initial.discountPct));
  const [vat, setVat] = useState(String(initial.vatRate));
  const [studentId, setStudentId] = useState(initial.studentId ?? "");
  const [prospect, setProspect] = useState({
    prospectFirstName: initial.prospectFirstName, prospectLastName: initial.prospectLastName,
    prospectEmail: initial.prospectEmail, prospectPhone: initial.prospectPhone,
  });

  const course = courses.find((c) => c.id === courseId);
  const noPrices = course && course.packagePriceCents == null && course.lessonPriceCents == null;

  const regenerate = (c = course, n = lessons) => {
    if (!c) return;
    const line = toRow(courseLine(c, n));
    setRows((r) => [line, ...r.slice(1)]);
    setAutoFirst(true);
  };

  const lines: QuoteLine[] = rows.map((r) => ({
    label: r.label,
    qty: Number(r.qty.replace(",", ".")) || 0,
    unitCents: parseEuro(r.unit) ?? 0,
  }));
  const totals = useMemo(
    () => computeQuote({ lines, discountPct: Number(discount.replace(",", ".")) || 0, vatRate: Number(vat.replace(",", ".")) || 0 }),
    [lines, discount, vat],
  );

  const setRow = (i: number, patch: Partial<Row>) => {
    if (i === 0) setAutoFirst(false);
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };
  const addRow = (label: string, unitCents = 0) => setRows((r) => [...r, { label, qty: "1", unit: centsToInput(unitCents) }]);

  return (
    <ActionForm action={action} className="grid gap-6 xl:grid-cols-[1fr_340px]" render={(state, pending) => (
      <>
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="font-serif text-[22px] text-wine-dark">Destinataria</h2>
            {students.length > 0 && (
              <Field label="Allieva già in anagrafica (facoltativo)">
                <select className="input" name="studentId" value={studentId} onChange={(e) => {
                  setStudentId(e.target.value);
                  const s = students.find((x) => x.id === e.target.value);
                  if (s) setProspect({ prospectFirstName: s.firstName, prospectLastName: s.lastName, prospectEmail: s.email, prospectPhone: s.phone ?? "" });
                }}>
                  <option value="">— Nuova potenziale allieva —</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName} · {s.email}</option>)}
                </select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["prospectFirstName", "Nome *", "text"],
                ["prospectLastName", "Cognome *", "text"],
                ["prospectEmail", "Email * (riceve il preventivo)", "email"],
                ["prospectPhone", "Telefono", "tel"],
              ] as const).map(([k, label, type]) => (
                <Field key={k} label={label}>
                  <input className="input" type={type} name={k} value={prospect[k]} readOnly={!!studentId} required={k !== "prospectPhone"}
                    onChange={(e) => setProspect((p) => ({ ...p, [k]: e.target.value }))} />
                </Field>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-serif text-[22px] text-wine-dark">Corso</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Tipologia *">
                <select className="input" name="courseTypeId" value={courseId} onChange={(e) => {
                  const c = courses.find((x) => x.id === e.target.value);
                  setCourseId(e.target.value);
                  const n = c?.durationLessons ?? lessons;
                  setLessons(n);
                  regenerate(c, n);
                }}>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
              <Field label="N. lezioni *">
                <input className="input" type="number" min={1} max={100} name="lessons" value={lessons} onChange={(e) => {
                  const n = Math.max(1, Number(e.target.value) || 1);
                  setLessons(n);
                  if (autoFirst) regenerate(course, n);
                }} />
              </Field>
              <Field label="Durata lezione (min)"><input className="input" type="number" min={15} name="lessonMinutes" defaultValue={initial.lessonMinutes} /></Field>
            </div>
            {course && (
              <p className="text-xs text-muted">
                Listino: {course.packagePriceCents != null ? `pacchetto ${course.durationLessons} lezioni ${euro(course.packagePriceCents)}` : "nessun pacchetto"}
                {" · "}{course.lessonPriceCents != null ? `lezione singola ${euro(course.lessonPriceCents)}` : "nessun prezzo a lezione"}
                {noPrices && <span className="text-warn"> — imposta i prezzi nella tipologia (Corsi) per il calcolo automatico.</span>}
              </p>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-[22px] text-wine-dark">Voci</h2>
              <button type="button" className="text-sm text-wine underline" onClick={() => regenerate()}>Ricalcola da listino</button>
            </div>
            <div className="hidden grid-cols-[1fr_70px_110px_100px_36px] gap-2 text-xs font-medium text-muted sm:grid">
              <span>Descrizione</span><span>Q.tà</span><span>Prezzo unit. €</span><span className="text-right">Importo</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_110px] gap-2 rounded-xl bg-[#faf8f7] p-2 sm:grid-cols-[1fr_70px_110px_100px_36px] sm:bg-transparent sm:p-0">
                <input className="input col-span-3 sm:col-span-1" aria-label="Descrizione" value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
                <input className="input" aria-label="Quantità" inputMode="decimal" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
                <input className="input" aria-label="Prezzo unitario" inputMode="decimal" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} />
                <span className="self-center text-right text-sm font-medium">{euro(Math.round(lines[i].qty * lines[i].unitCents))}</span>
                <button type="button" aria-label="Rimuovi voce" disabled={rows.length === 1}
                  className="h-9 w-9 self-center rounded-lg border border-line bg-white text-muted hover:bg-ln-50 disabled:opacity-30"
                  onClick={() => { if (i === 0) setAutoFirst(false); setRows((x) => x.filter((_, j) => j !== i)); }}>✕</button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-sm text-muted">Aggiungi:</span>
              {[
                ["Lezione aggiuntiva", course?.lessonPriceCents ?? 0],
                ["Prova in location / chiesa", 0],
                ["Lezione con abito e accessori", 0],
                ["Voce libera", 0],
              ].map(([label, cents]) => (
                <button key={label as string} type="button" onClick={() => addRow(label as string, cents as number)}
                  className="rounded-full bg-ln-50 px-3 py-1 text-xs font-medium text-wine hover:bg-ln-100">+ {label}</button>
              ))}
            </div>
          </Card>

          <Card className="grid gap-3 sm:grid-cols-2">
            <Field label="Validità fino al *"><input className="input" type="date" name="validUntil" defaultValue={initial.validUntil} required /></Field>
            <div />
            <div className="sm:col-span-2">
              <Field label="Note per l’allieva (condizioni, modalità di pagamento, cosa è incluso…)">
                <textarea className="input min-h-24" name="notes" defaultValue={initial.notes} />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="xl:sticky xl:top-6 xl:h-fit">
          <Card className="space-y-4 border-ln-200">
            <h2 className="font-serif text-[22px] text-wine-dark">Riepilogo</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sconto %"><input className="input" name="discountPct" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
              <Field label="IVA %" hint="0 se in regime forfettario"><input className="input" name="vatRate" inputMode="decimal" value={vat} onChange={(e) => setVat(e.target.value)} /></Field>
            </div>
            <dl className="space-y-1 text-sm">
              <Row label="Imponibile voci" value={euro(totals.subtotalCents)} />
              {totals.discountCents > 0 && <Row label={`Sconto ${discount}%`} value={`− ${euro(totals.discountCents)}`} />}
              {totals.vatCents > 0 && <Row label={`IVA ${vat}%`} value={euro(totals.vatCents)} />}
              <div className="flex justify-between border-t border-ln-100 pt-2 font-serif text-2xl text-wine">
                <dt>Totale</dt><dd>{euro(totals.totalCents)}</dd>
              </div>
              {lessons > 0 && <p className="text-right text-xs text-muted">≈ {euro(Math.round(totals.totalCents / lessons))} a lezione</p>}
            </dl>
            <input type="hidden" name="lines" value={JSON.stringify(lines)} />
            <FormMessage state={state} />
            <Button className="w-full" disabled={pending}>{pending ? "Salvataggio…" : "Salva e rivedi prima dell’invio"}</Button>
          </Card>
        </aside>
      </>
    )} />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className={cx("flex justify-between")}><dt className="text-muted">{label}</dt><dd>{value}</dd></div>;
}
