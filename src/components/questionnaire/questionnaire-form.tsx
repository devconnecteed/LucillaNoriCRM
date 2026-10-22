"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveAnswers } from "@/server/assignments";
import { isAnswered } from "@/lib/questionnaire/logic";
import type { Answers, AnswerValue, QuestionnaireContent } from "@/lib/questionnaire/types";
import { Button, Card, cx } from "../ui";
import { ItemInput } from "./item-input";
import { AnswerDisplay } from "./answer-display";

type Props = {
  assignmentId: string;
  content: QuestionnaireContent;
  initialAnswers: Answers;
  doneHref: string;
  /** Anteprima del builder: nessun salvataggio. */
  preview?: boolean;
};

/** Form guidato a sezioni (spec §7): progress bar, avanti/indietro, bozza, riepilogo e conferma. */
export function QuestionnaireForm({ assignmentId, content, initialAnswers, doneHref, preview }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0); // 0..sections.length (ultimo = riepilogo)
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const sections = content.sections;
  const isSummary = step === sections.length;
  const section = sections[step];

  const answerable = useMemo(() => sections.flatMap((s) => s.items).filter((i) => i.type !== "info"), [sections]);
  const answeredCount = answerable.filter((i) => isAnswered(i, answers[i.id])).length;
  const progress = Math.round(((isSummary ? sections.length : step) / sections.length) * 100);

  const set = (id: string, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setDirty(true);
    setMissing((m) => { const n = new Set(m); n.delete(id); return n; });
  };

  const sectionMissing = (idx: number) =>
    sections[idx].items.filter((i) => i.required && i.type !== "info" && !isAnswered(i, answers[i.id])).map((i) => i.id);

  const go = (next: number) => {
    if (next > step && !isSummary) {
      const miss = sectionMissing(step);
      if (miss.length) {
        setMissing(new Set(miss));
        setMsg({ type: "error", text: "Rispondi alle domande obbligatorie evidenziate per continuare." });
        return;
      }
    }
    setMsg(null);
    setStep(next);
    if (!preview && dirty) persist(false, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const persist = (submit: boolean, silent = false) => {
    if (preview) {
      setMsg({ type: "ok", text: submit ? "Anteprima: in compilazione reale il questionario verrebbe consegnato." : "Anteprima: nessun dato salvato." });
      return;
    }
    start(async () => {
      const res = await saveAnswers(assignmentId, answers, submit);
      if (res?.error) {
        setMsg({ type: "error", text: res.error });
        if (res.missing) {
          setMissing(new Set(res.missing));
          const first = sections.findIndex((s) => s.items.some((i) => res.missing!.includes(i.id)));
          if (first >= 0) setStep(first);
        }
        return;
      }
      setDirty(false);
      if (submit) {
        router.push(doneHref);
        router.refresh();
      } else if (!silent) setMsg({ type: "ok", text: "Bozza salvata: puoi riprendere quando vuoi." });
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="sticky top-0 z-10 -mx-4 mb-4 bg-ivory/95 px-4 py-3 backdrop-blur">
        <div className="mb-1 flex justify-between text-xs text-stone-600">
          <span>{isSummary ? "Riepilogo" : `Sezione ${step + 1} di ${sections.length}`}</span>
          <span>{answeredCount}/{answerable.length} risposte</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ln-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-ln-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 0 && content.intro && <p className="mb-4 rounded-xl bg-ln-50 p-4 text-sm text-ln-900">{content.intro}</p>}

      {!isSummary && section && (
        <Card className="space-y-6">
          <div>
            <h2 className="font-serif text-xl text-ln-900">{section.title}</h2>
            {section.description && <p className="mt-1 text-sm text-stone-600">{section.description}</p>}
          </div>
          {section.items.map((item) => {
            const invalid = missing.has(item.id);
            return (
              <fieldset key={item.id} className={cx("space-y-2", invalid && "rounded-xl bg-red-50 p-3 ring-1 ring-red-200")}>
                <legend className={cx("mb-2 font-medium", item.type === "info" ? "text-ln-800" : "text-ink")}>
                  {item.label}
                  {item.required && item.type !== "info" && <span className="text-ln-600" aria-label="obbligatoria"> *</span>}
                </legend>
                {item.help && <p className="text-sm text-stone-600">{item.help}</p>}
                <ItemInput item={item} value={answers[item.id]} onChange={(v) => set(item.id, v)} invalid={invalid} />
                {invalid && <p className="text-xs text-red-700">Risposta obbligatoria.</p>}
              </fieldset>
            );
          })}
        </Card>
      )}

      {isSummary && (
        <Card className="space-y-6">
          <div>
            <h2 className="font-serif text-xl text-ln-900">Controlla e invia</h2>
            <p className="mt-1 text-sm text-stone-600">Dopo l’invio potrai modificare le risposte solo se la tua insegnante riapre il questionario.</p>
          </div>
          {sections.map((s, idx) => (
            <div key={s.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium text-ln-800">{s.title}</h3>
                <button type="button" className="text-sm text-ln-700 underline" onClick={() => setStep(idx)}>Modifica</button>
              </div>
              <dl className="space-y-2 text-sm">
                {s.items.filter((i) => i.type !== "info").map((i) => (
                  <div key={i.id} className="rounded-lg bg-stone-50 p-2">
                    <dt className="text-stone-600">{i.label}</dt>
                    <dd className="font-medium"><AnswerDisplay item={i} value={answers[i.id]} /></dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          {content.outro && <p className="rounded-xl bg-ln-50 p-4 text-sm text-ln-900">{content.outro}</p>}
        </Card>
      )}

      {msg && (
        <p role={msg.type === "error" ? "alert" : "status"} className={cx("mt-4 text-sm", msg.type === "error" ? "text-red-700" : "text-emerald-700")}>
          {msg.text}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-10">
        <Button variant="secondary" type="button" disabled={step === 0 || pending} onClick={() => go(step - 1)}>← Indietro</Button>
        <Button variant="ghost" type="button" disabled={pending} onClick={() => persist(false)}>Salva bozza</Button>
        {isSummary ? (
          <Button type="button" disabled={pending} onClick={() => persist(true)}>{pending ? "Invio…" : "Invia risposte"}</Button>
        ) : (
          <Button type="button" disabled={pending} onClick={() => go(step + 1)}>
            {step === sections.length - 1 ? "Riepilogo →" : "Avanti →"}
          </Button>
        )}
      </div>
    </div>
  );
}
