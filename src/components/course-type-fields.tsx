import type { CourseType } from "@prisma/client";
import { MODE_LABELS } from "@/lib/constants";
import { centsToInput } from "@/lib/quote";
import { Field, FormStep } from "./ui";

/** Campi della tipologia di corso (modello riutilizzabile: metodo, durata, listino). */
export function CourseTypeFields({ ct }: { ct?: CourseType }) {
  return (
    <div className="space-y-7">
      <div>
        <FormStep n={1} title="Il percorso" />
        <div className="grid gap-[18px] sm:grid-cols-2">
          <Field label="Titolo *"><input className="input" name="title" defaultValue={ct?.title} required placeholder="Es. Portamento Sposa" /></Field>
          <Field label="Categoria"><input className="input" name="category" defaultValue={ct?.category ?? ""} placeholder="Es. Sposa" /></Field>
          <Field label="Descrizione breve" className="sm:col-span-2"><textarea className="input" name="description" defaultValue={ct?.description ?? ""} /></Field>
          <Field label="Obiettivi" hint="Mostrati anche nel preventivo."><textarea className="input" name="objectives" defaultValue={ct?.objectives ?? ""} /></Field>
          <Field label="Programma"><textarea className="input" name="program" defaultValue={ct?.program ?? ""} /></Field>
          <Field label="Prerequisiti" className="sm:col-span-2"><input className="input" name="prerequisites" defaultValue={ct?.prerequisites ?? ""} /></Field>
        </div>
      </div>
      <div>
        <FormStep n={2} title="Durata e modalità" />
        <div className="grid gap-[18px] sm:grid-cols-3">
          <Field label="Lezioni standard"><input className="input" type="number" min={0} name="durationLessons" defaultValue={ct?.durationLessons ?? ""} /></Field>
          <Field label="Ore totali"><input className="input" type="number" min={0} step={0.5} name="durationHours" defaultValue={ct?.durationHours ?? ""} /></Field>
          <Field label="Modalità">
            <select className="input" name="mode" defaultValue={ct?.mode ?? "BOTH"}>
              {Object.entries(MODE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        </div>
        <label className="mt-4 flex items-center gap-2.5 text-[13px]">
          <input type="checkbox" name="certificateEnabled" defaultChecked={ct?.certificateEnabled ?? true} className="h-4 w-4 accent-[var(--color-wine)]" />
          Rilascia l’attestato di partecipazione a fine percorso
        </label>
      </div>
      <div>
        <FormStep n={3} title="Listino" description="Usato dal preventivatore: pacchetto per il numero di lezioni standard, prezzo singolo per lezioni extra o pacchetti diversi." />
        <div className="grid gap-[18px] sm:grid-cols-2">
          <Field label="Prezzo pacchetto (€)"><input className="input" inputMode="decimal" name="packagePrice" defaultValue={centsToInput(ct?.packagePriceCents)} placeholder="es. 350,00" /></Field>
          <Field label="Prezzo lezione singola (€)"><input className="input" inputMode="decimal" name="lessonPrice" defaultValue={centsToInput(ct?.lessonPriceCents)} placeholder="es. 90,00" /></Field>
        </div>
      </div>
    </div>
  );
}
