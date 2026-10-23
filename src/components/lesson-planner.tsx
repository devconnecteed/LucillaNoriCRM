"use client";

import { useMemo, useState } from "react";
import { planLesson } from "@/server/courses";
import { ActionForm, FormMessage } from "./action-form";
import { Button, ButtonLink, Card, Field, FormStep } from "./ui";
import { Icon } from "./icons";

export type PlannerEdition = {
  id: string;
  title: string;
  course: string;
  teacher: { name: string; email: string };
  recipients: { name: string; email: string; note?: string }[];
  lessons: { id: string; number: number; topic: string | null; date: string | null; durationMin: number; location: string | null }[];
};

/** Valore per <input type="datetime-local"> nell'ora locale. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function LessonPlanner({ editions, initialEditionId, initialLessonId, defaultDate }: {
  editions: PlannerEdition[]; initialEditionId?: string; initialLessonId?: string; defaultDate: string;
}) {
  const [editionId, setEditionId] = useState(initialEditionId ?? editions[0]?.id ?? "");
  const edition = editions.find((e) => e.id === editionId);
  const firstFree = (e?: PlannerEdition) => e?.lessons.find((l) => !l.date)?.id ?? "new";
  const [lessonId, setLessonId] = useState(initialLessonId ?? firstFree(edition));
  const lesson = edition?.lessons.find((l) => l.id === lessonId);
  const [notify, setNotify] = useState(true);

  const nextNumber = useMemo(() => Math.max(0, ...(edition?.lessons.map((l) => l.number) ?? [0])) + 1, [edition]);

  return (
    <ActionForm action={planLesson} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" render={(state, pending) => (
      <>
        <Card className="space-y-7">
          <div>
            <FormStep n={1} title="Percorso e lezione" />
            <div className="grid gap-[18px] sm:grid-cols-2">
              <Field label="Edizione *">
                <select className="input" name="editionId" value={editionId} onChange={(e) => {
                  const next = editions.find((x) => x.id === e.target.value);
                  setEditionId(e.target.value);
                  setLessonId(firstFree(next));
                }}>
                  {editions.map((e) => <option key={e.id} value={e.id}>{e.title} · {e.course}</option>)}
                </select>
              </Field>
              <Field label="Lezione *">
                <select className="input" name="lessonId" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
                  {edition?.lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      Lezione {l.number}{l.topic ? ` · ${l.topic}` : ""}{l.date ? ` (fissata il ${new Date(l.date).toLocaleDateString("it-IT")})` : " (da fissare)"}
                    </option>
                  ))}
                  <option value="new">+ Nuova lezione ({nextNumber})</option>
                </select>
              </Field>
            </div>
            {lesson?.date && (
              <p className="callout mt-4 !text-[13px]">
                Questa lezione è già fissata il {new Date(lesson.date).toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short" })}.
                Cambiando data o ora la sposterai: chi è coinvolto riceverà l’invito aggiornato.
              </p>
            )}
          </div>

          {/* key: i valori predefiniti cambiano con la lezione scelta */}
          <div key={`${editionId}-${lessonId}`}>
            <FormStep n={2} title="Quando e dove" />
            <div className="grid gap-[18px] sm:grid-cols-3">
              <Field label="Data e ora *" className="sm:col-span-2">
                <input className="input" type="datetime-local" name="date" required defaultValue={lesson?.date ? toLocalInput(lesson.date) : `${defaultDate}T10:00`} />
              </Field>
              <Field label="Durata (minuti)">
                <input className="input" type="number" name="durationMin" min={15} step={15} defaultValue={lesson?.durationMin ?? 60} />
              </Field>
              <Field label="Argomento" className="sm:col-span-2">
                <input className="input" name="topic" defaultValue={lesson?.topic ?? ""} placeholder="Es. Ingresso e gestione dello strascico" />
              </Field>
              <Field label="Luogo" hint="Compare nell’invito del calendario.">
                <input className="input" name="location" defaultValue={lesson?.location ?? ""} placeholder="Es. Studio LN, Via…" />
              </Field>
            </div>
          </div>

          <FormMessage state={state} />
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-line pt-5">
            <ButtonLink variant="secondary" href="/docente/calendario">Annulla</ButtonLink>
            <Button icon={notify ? "send" : "calendar"} disabled={pending || !edition}>
              {pending ? "Salvataggio…" : notify ? "Pianifica e invia l’invito" : "Pianifica"}
            </Button>
          </div>
        </Card>

        <aside>
          <Card>
            <FormStep n={3} title="Persone coinvolte" />
            <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-[10px] border border-[#f2e3df] bg-[#faf4f2] px-4 py-3">
              <input type="checkbox" name="notify" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-wine)]" />
              <span>
                <span className="block text-[13px] font-semibold">Invia l’invito via email</span>
                <span className="block text-xs text-muted">Con il file calendario allegato e i link per Google Calendar e Apple Calendar.</span>
              </span>
            </label>
            {edition && (
              <ul className={notify ? "space-y-2.5" : "space-y-2.5 opacity-40"}>
                <li className="flex items-center gap-2.5 text-[13px]">
                  <Icon name="award" className="h-4 w-4 text-ln-400" />
                  <span className="min-w-0"><b className="font-semibold">{edition.teacher.name}</b> <span className="text-xs text-muted">· docente</span><span className="block truncate text-xs text-muted">{edition.teacher.email}</span></span>
                </li>
                {edition.recipients.map((r) => (
                  <li key={r.email} className="flex items-center gap-2.5 text-[13px]">
                    <Icon name="users" className="h-4 w-4 text-ln-400" />
                    <span className="min-w-0"><b className="font-semibold">{r.name}</b>{r.note && <span className="text-xs text-muted"> · {r.note}</span>}<span className="block truncate text-xs text-muted">{r.email}</span></span>
                  </li>
                ))}
                {!edition.recipients.length && <li className="text-xs text-muted">Nessuna allieva iscritta: riceverà l’invito solo la docente.</li>}
              </ul>
            )}
          </Card>
        </aside>
      </>
    )} />
  );
}
