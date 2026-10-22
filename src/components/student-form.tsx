"use client";

import { useState } from "react";
import type { Student } from "@prisma/client";
import type { ActionState } from "@/server/students";
import { CONSENT_LABELS } from "@/lib/constants";
import { Button, ButtonLink, Card, Field, FormStep } from "./ui";
import { ActionForm, FormMessage } from "./action-form";

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;
type Bridal = Partial<Record<"weddingDate" | "venue" | "ceremonyType" | "song" | "dressStyle" | "train" | "veil" | "heels" | "bouquet", string>>;

const BRIDAL_FIELDS: [keyof Bridal, string, string?][] = [
  ["weddingDate", "Data del matrimonio", "date"],
  ["venue", "Luogo / location"],
  ["ceremonyType", "Tipo di cerimonia"],
  ["song", "Canzone d’ingresso"],
  ["dressStyle", "Stile dell’abito"],
  ["train", "Strascico"],
  ["veil", "Velo"],
  ["heels", "Tacco (altezza, tipo)"],
  ["bouquet", "Bouquet"],
];

function Toggle({ checked, onChange, label, hint, name }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; name?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[#f2e3df] bg-[#faf4f2] px-4 py-3">
      <input type="checkbox" name={name} className="mt-0.5 h-4 w-4 accent-[var(--color-wine)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-[13px] font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * Anagrafica allieva (tavola 13): prima i dati essenziali, poi quelli didattici;
 * i campi aggiuntivi (minore, sposa, salute) compaiono solo quando servono.
 */
export function StudentForm({ action, student, teachers, cancelHref }: {
  action: Action; student?: Student; teachers?: { id: string; name: string }[]; cancelHref?: string;
}) {
  const bridal = (student?.bridalInfo ?? {}) as Bridal;
  const [minor, setMinor] = useState(student?.isMinor ?? false);
  const [isBride, setIsBride] = useState(Object.keys(bridal).length > 0);
  const [hasPhysical, setHasPhysical] = useState(!!student?.physicalNotes);
  const v = (k: keyof Student) => (student?.[k] as string | null | undefined) ?? "";
  const isCreate = !student;

  return (
    <ActionForm action={action} className="space-y-5" render={(state, pending) => (<>
      <Card>
        <FormStep n={1} title="Dati anagrafici" />
        <div className="grid gap-[18px] sm:grid-cols-2">
          <Field label="Nome *"><input className="input" name="firstName" defaultValue={v("firstName")} placeholder="Es. Giulia" required autoComplete="off" /></Field>
          <Field label="Cognome *"><input className="input" name="lastName" defaultValue={v("lastName")} placeholder="Es. Rossi" required autoComplete="off" /></Field>
          <Field label="Email *" hint="Riceverà qui l’invito all’area riservata."><input className="input" type="email" name="email" defaultValue={v("email")} placeholder="nome@email.it" required autoComplete="off" /></Field>
          <Field label="Telefono"><input className="input" type="tel" name="phone" defaultValue={v("phone")} placeholder="+39 …" autoComplete="off" /></Field>
          <Field label="Data di nascita" hint="Solo se necessaria."><input className="input" type="date" name="birthDate" defaultValue={student?.birthDate?.toISOString().slice(0, 10) ?? ""} /></Field>
          <Field label="Stato">
            <select className="input" name="status" defaultValue={student?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Attiva</option><option value="INACTIVE">Non attiva</option><option value="ARCHIVED">Archiviata</option>
            </select>
          </Field>
          <Field label="Indirizzo"><input className="input" name="address" defaultValue={v("address")} placeholder="Facoltativo" /></Field>
          <Field label="Contatto di emergenza"><input className="input" name="emergencyContact" defaultValue={v("emergencyContact")} placeholder="Facoltativo" /></Field>
          {teachers && teachers.length > 1 && (
            <Field label="Docente di riferimento">
              <select className="input" name="teacherId" defaultValue={student?.teacherId}>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        <div className="mt-5">
          <Toggle name="isMinor" checked={minor} onChange={setMinor} label="Allieva minorenne" hint="Servono i dati e le autorizzazioni del genitore o tutore." />
        </div>
        {minor && (
          <div className="mt-4 grid gap-[18px] sm:grid-cols-3">
            <Field label="Genitore / tutore *"><input className="input" name="guardianName" defaultValue={v("guardianName")} /></Field>
            <Field label="Email tutore" hint="Inviti e notifiche vanno a questo indirizzo."><input className="input" type="email" name="guardianEmail" defaultValue={v("guardianEmail")} /></Field>
            <Field label="Telefono tutore"><input className="input" name="guardianPhone" defaultValue={v("guardianPhone")} /></Field>
          </div>
        )}
      </Card>

      <Card>
        <FormStep n={2} title="Dati didattici" />
        <div className="grid gap-[18px] sm:grid-cols-2">
          <Field label="Obiettivi" className="sm:col-span-2"><textarea className="input" name="goals" defaultValue={v("goals")} placeholder="Cosa vorrebbe migliorare?" /></Field>
          <Field label="Esperienza"><textarea className="input" name="experience" defaultValue={v("experience")} placeholder="Sport, danza, passerella…" /></Field>
          <Field label="Preferenze"><textarea className="input" name="preferences" defaultValue={v("preferences")} placeholder="Orari, modalità…" /></Field>
          <Field label="Come ci ha conosciuto"><input className="input" name="leadSource" defaultValue={v("leadSource")} /></Field>
          <Field label="Note amministrative"><input className="input" name="adminNotes" defaultValue={v("adminNotes")} /></Field>
        </div>
      </Card>

      <Card>
        <FormStep n={3} title="Informazioni contestuali" description="Attiva solo ciò che serve per il percorso di questa allieva." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle checked={isBride} onChange={setIsBride} label="Percorso Sposa" hint="Data e dettagli del matrimonio." />
          <Toggle checked={hasPhysical} onChange={setHasPhysical} label="Dolori o limitazioni fisiche" hint="Solo se strettamente necessario." />
        </div>
        {isBride && (
          <div className="mt-5 grid gap-[18px] sm:grid-cols-3">
            {BRIDAL_FIELDS.map(([k, label, type]) => (
              <Field key={k} label={label}><input className="input" type={type ?? "text"} name={`bridal.${k}`} defaultValue={bridal[k] ?? ""} /></Field>
            ))}
          </div>
        )}
        {hasPhysical && (
          <div className="mt-5 space-y-3">
            <p className="callout">
              Dato potenzialmente relativo alla salute (art. 9 GDPR): registra il consenso specifico. Il campo è visibile solo alla
              docente di riferimento e all’amministratrice; non inserire queste informazioni nelle note generiche.
            </p>
            <Field label="Dolori o limitazioni fisiche"><textarea className="input" name="physicalNotes" defaultValue={v("physicalNotes")} /></Field>
          </div>
        )}
        {/* Disattivando i riquadri i dati vengono svuotati al salvataggio */}
        {!isBride && <input type="hidden" name="bridalClear" value="1" />}
        {!hasPhysical && <input type="hidden" name="physicalNotes" value="" />}
      </Card>

      {isCreate && (
        <Card>
          <FormStep n={4} title="Consensi acquisiti" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(CONSENT_LABELS).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2.5 text-[13px]"><input type="checkbox" name={`consent.${k}`} className="h-4 w-4 accent-[var(--color-wine)]" /> {label}</label>
            ))}
          </div>
        </Card>
      )}

      {isCreate && state?.error?.includes("Crea comunque") && (
        <label className="flex items-center gap-2 rounded-xl bg-warn-bg p-3 text-sm text-warn"><input type="checkbox" name="confirmDuplicate" /> Crea comunque</label>
      )}
      <FormMessage state={state} />
      <div className="flex flex-wrap justify-end gap-2.5 border-t border-line pt-5">
        {cancelHref && <ButtonLink variant="secondary" href={cancelHref}>Annulla</ButtonLink>}
        <Button disabled={pending}>{pending ? "Salvataggio…" : isCreate ? "Salva anagrafica" : "Salva modifiche"}</Button>
      </div>
    </>)} />
  );
}
