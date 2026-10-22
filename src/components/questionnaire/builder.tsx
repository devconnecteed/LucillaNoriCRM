"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { publishVersion, saveDraft } from "@/server/questionnaires";
import { newId } from "@/lib/questionnaire/logic";
import { ITEM_TYPE_LABELS, WEEK_DAYS, type Item, type ItemType, type Option, type QuestionnaireContent, type Section } from "@/lib/questionnaire/types";
import { Button, Card, cx } from "../ui";
import { QuestionnaireForm } from "./questionnaire-form";

type Props = { versionId: string; version: number; initial: QuestionnaireContent; readOnly: boolean };

function blankItem(type: ItemType): Item {
  const id = newId();
  const opts = (n: number): Option[] => Array.from({ length: n }, (_, i) => ({ id: `o${i + 1}`, label: `Opzione ${i + 1}` }));
  switch (type) {
    case "single": return { id, type, label: "Nuova domanda", options: opts(3), required: true };
    case "multiple": return { id, type, label: "Nuova domanda", options: opts(3), required: false };
    case "scale": return { id, type, label: "Nuova affermazione", min: 1, max: 5, minLabel: "per niente", maxLabel: "moltissimo", required: true };
    case "text": return { id, type, label: "Nuova domanda aperta", long: true };
    case "diary": return { id, type, label: "Diario settimanale", rows: [{ id: "o1", label: "Esercizio 1" }], days: [...WEEK_DAYS] };
    case "rubric": return { id, type, label: "Competenze osservate", criteria: opts(3).map((o, i) => ({ ...o, label: `Criterio ${i + 1}` })), min: 1, max: 5, minLabel: "da migliorare", maxLabel: "ottimo", required: true };
    case "info": return { id, type, label: "Titolo", help: "Testo informativo o istruzioni." };
    case "date": return { id, type, label: "Data" };
  }
}

const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

export function Builder({ versionId, version, initial, readOnly }: Props) {
  const router = useRouter();
  const [content, setContent] = useState<QuestionnaireContent>(initial);
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const update = (fn: (c: QuestionnaireContent) => QuestionnaireContent) => {
    setContent((c) => fn(c));
    setDirty(true);
    setMsg(null);
  };
  const updSection = (si: number, patch: Partial<Section>) =>
    update((c) => ({ ...c, sections: c.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) }));
  const updItem = (si: number, ii: number, patch: Partial<Item>) =>
    update((c) => ({
      ...c,
      sections: c.sections.map((s, i) => (i === si ? { ...s, items: s.items.map((it, j) => (j === ii ? ({ ...it, ...patch } as Item) : it)) } : s)),
    }));
  const setItems = (si: number, fn: (items: Item[]) => Item[]) =>
    update((c) => ({ ...c, sections: c.sections.map((s, i) => (i === si ? { ...s, items: fn(s.items) } : s)) }));

  const run = (publish: boolean) =>
    start(async () => {
      if (publish && !confirm(`Pubblicare la versione ${version}? Da quel momento non sarà più modificabile e potrà essere assegnata.`)) return;
      const res = publish ? await publishVersion(versionId, content) : await saveDraft(versionId, content);
      setMsg(res?.error ? { type: "error", text: res.error } : { type: "ok", text: res?.ok ?? "Salvato" });
      if (!res?.error) {
        setDirty(false);
        router.refresh();
      }
    });

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b border-stone-200 bg-ivory/95 px-4 py-3 backdrop-blur">
        <span className="text-sm text-stone-600">
          Versione {version} · {readOnly ? "pubblicata (sola lettura)" : dirty ? "modifiche non salvate" : "bozza"}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" type="button" onClick={() => setPreview((p) => !p)}>{preview ? "Torna all’editor" : "Anteprima mobile"}</Button>
          {!readOnly && (
            <>
              <Button variant="secondary" type="button" disabled={pending} onClick={() => run(false)}>Salva bozza</Button>
              <Button type="button" disabled={pending} onClick={() => run(true)}>Pubblica v{version}</Button>
            </>
          )}
        </div>
        {msg && <p role="status" className={cx("w-full text-sm", msg.type === "error" ? "text-red-700" : "text-emerald-700")}>{msg.text}</p>}
      </div>

      {preview ? (
        <div className="mx-auto w-full max-w-[400px] rounded-[2rem] border-8 border-stone-800 bg-ivory p-4 shadow-xl">
          <QuestionnaireForm assignmentId="preview" content={content} initialAnswers={{}} doneHref="#" preview />
        </div>
      ) : (
        <fieldset disabled={readOnly} className="space-y-6">
          <Card className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">Introduzione (mostrata all’inizio)</span>
              <textarea className="input min-h-20" value={content.intro ?? ""} onChange={(e) => update((c) => ({ ...c, intro: e.target.value || undefined }))} /></label>
            <label className="block"><span className="label">Messaggio finale (prima dell’invio)</span>
              <textarea className="input min-h-20" value={content.outro ?? ""} onChange={(e) => update((c) => ({ ...c, outro: e.target.value || undefined }))} /></label>
          </Card>

          {content.sections.map((s, si) => (
            <Card key={s.id} className="space-y-4 border-ln-200">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <input className="input font-serif text-lg" aria-label="Titolo sezione" value={s.title} onChange={(e) => updSection(si, { title: e.target.value })} />
                  <input className="input" placeholder="Descrizione / istruzioni della sezione" value={s.description ?? ""} onChange={(e) => updSection(si, { description: e.target.value || undefined })} />
                </div>
                <div className="flex gap-1">
                  <IconBtn label="Sposta su" onClick={() => update((c) => ({ ...c, sections: move(c.sections, si, -1) }))}>↑</IconBtn>
                  <IconBtn label="Sposta giù" onClick={() => update((c) => ({ ...c, sections: move(c.sections, si, 1) }))}>↓</IconBtn>
                  <IconBtn label="Elimina sezione" onClick={() => confirm("Eliminare la sezione e le sue domande?") && update((c) => ({ ...c, sections: c.sections.filter((_, i) => i !== si) }))}>✕</IconBtn>
                </div>
              </div>

              {s.items.map((it, ii) => (
                <ItemEditor key={it.id} item={it} index={ii}
                  onChange={(p) => updItem(si, ii, p)}
                  onMove={(d) => setItems(si, (items) => move(items, ii, d))}
                  onDuplicate={() => setItems(si, (items) => [...items.slice(0, ii + 1), { ...structuredClone(it), id: newId() }, ...items.slice(ii + 1)])}
                  onDelete={() => setItems(si, (items) => items.filter((_, j) => j !== ii))} />
              ))}

              {!readOnly && <AddItem onAdd={(t) => setItems(si, (items) => [...items, blankItem(t)])} />}
            </Card>
          ))}

          {!readOnly && (
            <Button variant="secondary" type="button" onClick={() => update((c) => ({ ...c, sections: [...c.sections, { id: newId("s"), title: `Sezione ${c.sections.length + 1}`, items: [] }] }))}>
              + Aggiungi sezione
            </Button>
          )}
        </fieldset>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-ln-50 disabled:opacity-40">
      {children}
    </button>
  );
}

function AddItem({ onAdd }: { onAdd: (t: ItemType) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-ln-200 p-3">
      <span className="text-sm text-stone-600">Aggiungi:</span>
      {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((t) => (
        <button key={t} type="button" onClick={() => onAdd(t)} className="rounded-full bg-ln-50 px-3 py-1 text-xs font-medium text-ln-800 hover:bg-ln-100">
          {ITEM_TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

function ItemEditor({ item, index, onChange, onMove, onDuplicate, onDelete }: {
  item: Item; index: number;
  onChange: (p: Partial<Item>) => void; onMove: (d: number) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ln-800 ring-1 ring-ln-200">{index + 1} · {ITEM_TYPE_LABELS[item.type]}</span>
        {item.type !== "info" && (
          <label className="flex items-center gap-1 text-xs text-stone-600">
            <input type="checkbox" checked={!!item.required} onChange={(e) => onChange({ required: e.target.checked })} /> obbligatoria
          </label>
        )}
        <div className="ml-auto flex gap-1">
          <IconBtn label="Sposta su" onClick={() => onMove(-1)}>↑</IconBtn>
          <IconBtn label="Sposta giù" onClick={() => onMove(1)}>↓</IconBtn>
          <IconBtn label="Duplica" onClick={onDuplicate}>⧉</IconBtn>
          <IconBtn label="Elimina domanda" onClick={onDelete}>✕</IconBtn>
        </div>
      </div>
      <div className="space-y-3">
        <input className="input" aria-label="Testo della domanda" value={item.label} onChange={(e) => onChange({ label: e.target.value })} />
        <input className="input text-sm" placeholder="Aiuto / istruzioni (facoltativo)" value={item.help ?? ""} onChange={(e) => onChange({ help: e.target.value || undefined })} />
        <TypeFields item={item} onChange={onChange} />
      </div>
    </div>
  );
}

function OptionsEditor({ options, onChange, correct, multiple, onCorrect, noun = "Opzione" }: {
  options: Option[]; onChange: (o: Option[]) => void; noun?: string;
  correct?: string[]; multiple?: boolean; onCorrect?: (ids: string[]) => void;
}) {
  const nextId = () => `o${Math.max(0, ...options.map((o) => Number(o.id.replace(/\D/g, "")) || 0)) + 1}`;
  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          {onCorrect && (
            <input type={multiple ? "checkbox" : "radio"} aria-label="Risposta corretta" title="Risposta corretta"
              checked={correct?.includes(o.id) ?? false}
              onChange={() => onCorrect(multiple ? (correct?.includes(o.id) ? correct.filter((c) => c !== o.id) : [...(correct ?? []), o.id]) : [o.id])} />
          )}
          <input className="input text-sm" value={o.label} aria-label={`${noun} ${i + 1}`}
            onChange={(e) => onChange(options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <IconBtn label={`Rimuovi ${noun.toLowerCase()}`} onClick={() => options.length > 1 && onChange(options.filter((_, j) => j !== i))}>−</IconBtn>
        </div>
      ))}
      <button type="button" className="text-sm text-ln-700 underline" onClick={() => onChange([...options, { id: nextId(), label: `${noun} ${options.length + 1}` }])}>
        + {noun}
      </button>
    </div>
  );
}

function TypeFields({ item, onChange }: { item: Item; onChange: (p: Partial<Item>) => void }) {
  const small = "input max-w-28 text-sm";
  switch (item.type) {
    case "single":
    case "multiple": {
      const correct = item.type === "single" ? (item.correct ? [item.correct] : []) : item.correct ?? [];
      const quiz = correct.length > 0;
      return (
        <div className="space-y-3">
          <p className="text-xs text-stone-500">Seleziona il pallino accanto a un’opzione per renderla la risposta corretta (quiz). Senza risposta corretta la domanda non ha punteggio.</p>
          <OptionsEditor options={item.options} onChange={(options) => onChange({ options })} correct={correct} multiple={item.type === "multiple"}
            onCorrect={(ids) => onChange(item.type === "single" ? { correct: ids[0] } : { correct: ids })} />
          {quiz && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">Punti <input type="number" min={0} step={0.5} className={small} value={item.points ?? 1} onChange={(e) => onChange({ points: Number(e.target.value) })} /></label>
              {item.type === "multiple" && (
                <select className="input max-w-56 text-sm" value={item.scoring ?? "all_or_nothing"} onChange={(e) => onChange({ scoring: e.target.value as "partial" })}>
                  <option value="all_or_nothing">Tutto o niente</option>
                  <option value="partial">Punteggio parziale</option>
                </select>
              )}
              <button type="button" className="text-ln-700 underline" onClick={() => onChange({ correct: undefined, points: undefined })}>Togli risposta corretta</button>
            </div>
          )}
        </div>
      );
    }
    case "scale":
    case "rubric":
      return (
        <div className="space-y-3">
          {item.type === "rubric" && <OptionsEditor noun="Criterio" options={item.criteria} onChange={(criteria) => onChange({ criteria })} />}
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <label>Da <input type="number" className={small} value={item.min} onChange={(e) => onChange({ min: Number(e.target.value) })} /></label>
            <label>A <input type="number" className={small} value={item.max} onChange={(e) => onChange({ max: Number(e.target.value) })} /></label>
            <input className="input text-sm" placeholder="Etichetta minimo" value={item.minLabel ?? ""} onChange={(e) => onChange({ minLabel: e.target.value || undefined })} />
            <input className="input text-sm" placeholder="Etichetta massimo" value={item.maxLabel ?? ""} onChange={(e) => onChange({ maxLabel: e.target.value || undefined })} />
          </div>
          <label className="block text-sm">
            <span className="text-stone-600">Chiave di confronto (facoltativa) – usa la stessa chiave solo per domande equivalenti tra questionari diversi (es. prima/dopo)</span>
            <input className="input mt-1 text-sm" placeholder="es. sicurezza_tacchi"
              value={(item.type === "scale" ? item.dimension : item.dimensionPrefix) ?? ""}
              onChange={(e) => onChange(item.type === "scale" ? { dimension: e.target.value || undefined } : { dimensionPrefix: e.target.value || undefined })} />
          </label>
        </div>
      );
    case "text":
      return (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!item.long} onChange={(e) => onChange({ long: e.target.checked })} /> Risposta lunga</label>
      );
    case "diary":
      return (
        <div className="space-y-3">
          <OptionsEditor noun="Esercizio" options={item.rows} onChange={(rows) => onChange({ rows })} />
          <label className="block text-sm"><span className="text-stone-600">Giorni (separati da virgola)</span>
            <input className="input mt-1 text-sm" value={item.days.join(", ")} onChange={(e) => onChange({ days: e.target.value.split(",").map((d) => d.trim()).filter(Boolean) })} /></label>
        </div>
      );
    default:
      return null;
  }
}
