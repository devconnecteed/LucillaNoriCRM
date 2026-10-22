"use client";

import { useState } from "react";
import type { Student } from "@prisma/client";
import type { ActionState } from "@/server/students";
import { CONSENT_LABELS } from "@/lib/constants";
import { Button, Card, Field } from "./ui";
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

export function StudentForm({ action, student, teachers }: { action: Action; student?: Student; teachers?: { id: string; name: string }[] }) {
  const [minor, setMinor] = useState(student?.isMinor ?? false);
  const bridal = (student?.bridalInfo ?? {}) as Bridal;
  const v = (k: keyof Student) => (student?.[k] as string | null | undefined) ?? "";
  const isCreate = !student;

  return (
    <ActionForm action={action} className="space-y-6" render={(state, pending) => (<>
      <Card className="space-y-4">
        <h2 className="font-serif text-lg text-ln-900">Dati anagrafici</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome *"><input className="input" name="firstName" defaultValue={v("firstName")} required /></Field>
          <Field label="Cognome *"><input className="input" name="lastName" defaultValue={v("lastName")} required /></Field>
          <Field label="Email *"><input className="input" type="email" name="email" defaultValue={v("email")} required /></Field>
          <Field label="Cellulare"><input className="input" type="tel" name="phone" defaultValue={v("phone")} /></Field>
          <Field label="Data di nascita" hint="Solo se necessaria."><input className="input" type="date" name="birthDate" defaultValue={student?.birthDate?.toISOString().slice(0, 10) ?? ""} /></Field>
          <Field label="Stato">
            <select className="input" name="status" defaultValue={student?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Attiva</option><option value="INACTIVE">Non attiva</option><option value="ARCHIVED">Archiviata</option>
            </select>
          </Field>
          <Field label="Indirizzo (facoltativo)"><input className="input" name="address" defaultValue={v("address")} /></Field>
          <Field label="Contatto di emergenza (facoltativo)"><input className="input" name="emergencyContact" defaultValue={v("emergencyContact")} /></Field>
          {teachers && teachers.length > 1 && (
            <Field label="Docente di riferimento">
              <select className="input" name="teacherId" defaultValue={student?.teacherId}>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isMinor" checked={minor} onChange={(e) => setMinor(e.target.checked)} /> Allieva minorenne
        </label>
        {minor && (
          <div className="grid gap-4 rounded-xl bg-amber-50 p-4 sm:grid-cols-3">
            <Field label="Genitore / tutore *"><input className="input" name="guardianName" defaultValue={v("guardianName")} /></Field>
            <Field label="Email tutore" hint="Inviti e notifiche vanno a questo indirizzo."><input className="input" type="email" name="guardianEmail" defaultValue={v("guardianEmail")} /></Field>
            <Field label="Telefono tutore"><input className="input" name="guardianPhone" defaultValue={v("guardianPhone")} /></Field>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-serif text-lg text-ln-900">Dati didattici</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Obiettivi"><textarea className="input" name="goals" defaultValue={v("goals")} /></Field>
          <Field label="Esperienza (sport, danza, passerella…)"><textarea className="input" name="experience" defaultValue={v("experience")} /></Field>
          <Field label="Preferenze (orari, modalità…)"><textarea className="input" name="preferences" defaultValue={v("preferences")} /></Field>
          <Field label="Come ci ha conosciuto"><input className="input" name="leadSource" defaultValue={v("leadSource")} /></Field>
        </div>
        <Field label="Note amministrative"><textarea className="input" name="adminNotes" defaultValue={v("adminNotes")} /></Field>
      </Card>

      <details className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" open={Object.keys(bridal).length > 0}>
        <summary className="cursor-pointer font-serif text-lg text-ln-900">Corso Sposa · dettagli del matrimonio</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {BRIDAL_FIELDS.map(([k, label, type]) => (
            <Field key={k} label={label}><input className="input" type={type ?? "text"} name={`bridal.${k}`} defaultValue={bridal[k] ?? ""} /></Field>
          ))}
        </div>
      </details>

      <Card className="space-y-3 border-amber-200">
        <h2 className="font-serif text-lg text-ln-900">Dolori o limitazioni fisiche</h2>
        <p className="text-sm text-amber-800">
          Dato potenzialmente relativo alla salute (art. 9 GDPR): compilare solo se strettamente necessario e con il consenso specifico registrato.
          Visibile solo alla docente di riferimento e all’amministratore.
        </p>
        <textarea className="input" name="physicalNotes" defaultValue={v("physicalNotes")} />
      </Card>

      {isCreate && (
        <Card className="space-y-2">
          <h2 className="font-serif text-lg text-ln-900">Consensi acquisiti</h2>
          {Object.entries(CONSENT_LABELS).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name={`consent.${k}`} /> {label}</label>
          ))}
        </Card>
      )}

      {isCreate && state?.error?.includes("Crea comunque") && (
        <label className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm"><input type="checkbox" name="confirmDuplicate" /> Crea comunque</label>
      )}
      <FormMessage state={state} />
      <Button disabled={pending}>{pending ? "Salvataggio…" : isCreate ? "Crea anagrafica" : "Salva modifiche"}</Button>
    </>)} />
  );
}
