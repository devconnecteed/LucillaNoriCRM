"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveAnswers } from "@/server/assignments";
import { isAnswered } from "@/lib/questionnaire/logic";
import { autoAdvances, buildSteps, resumeIndex } from "@/lib/questionnaire/steps";
import type { Answers, AnswerValue, Item, QuestionnaireContent } from "@/lib/questionnaire/types";
import { Icon } from "../icons";
import { cx } from "../ui";
import { ItemInput } from "./item-input";
import { AnswerDisplay } from "./answer-display";
import { CompletionScreen } from "./completion-screen";

type Props = {
  assignmentId: string;
  content: QuestionnaireContent;
  initialAnswers: Answers;
  /** Dove andare dopo l'invio. */
  doneHref: string;
  /** Dove porta la "X" in alto (salva prima la bozza). */
  closeHref?: string;
  title?: string;
  /** Testo della schermata finale. */
  doneMessage?: string;
  /** Anteprima del builder: nessun salvataggio, resa dentro la cornice del telefono. */
  preview?: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";
const AUTOSAVE_MS = 1200;
const AUTO_ADVANCE_MS = 280;
export const DEFAULT_DONE = "Le tue risposte sono state consegnate. La tua insegnante le leggerà e ti invierà il suo riscontro.";

/**
 * Compilazione "come un'app" (mobile-first): schermo intero, una domanda alla volta,
 * avanzamento automatico sulle scelte singole, swipe, salvataggio automatico della bozza,
 * riepilogo con modifica rapida e schermata di conferma.
 */
export function QuestionnaireForm({ assignmentId, content, initialAnswers, doneHref, closeHref, title, doneMessage, preview }: Props) {
  const router = useRouter();
  const steps = useMemo(() => buildSteps(content), [content]);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(() => (preview ? 0 : resumeIndex(steps, initialAnswers)));
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [errorId, setErrorId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();

  const answersRef = useRef(answers);
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null);

  const isSummary = step >= steps.length;
  const current = isSummary ? null : steps[step];
  const item = current?.item ?? null;
  const answerable = steps.filter((s) => s.item);
  const answeredCount = answerable.filter((s) => isAnswered(s.item!, answers[s.item!.id])).length;
  const progress = submitted ? 100 : Math.round((Math.min(step, steps.length) / steps.length) * 100);
  const stepOfItem = (id: string) => steps.findIndex((s) => s.item?.id === id);

  // ------------------------------------------------------------------ salvataggio automatico
  const save = useCallback(async () => {
    if (preview || !dirty.current) return true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    dirty.current = false;
    setSaveState("saving");
    try {
      const res = await saveAnswers(assignmentId, answersRef.current, false);
      if (res?.error) {
        setSaveState("error");
        setBanner(res.error);
        return false;
      }
      setSaveState("saved");
      return true;
    } catch {
      dirty.current = true; // riprova alla prossima modifica o al cambio di domanda
      setSaveState("error");
      return false;
    }
  }, [assignmentId, preview]);

  useEffect(() => {
    answersRef.current = answers;
    if (!dirty.current || preview) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, AUTOSAVE_MS);
  }, [answers, save, preview]);

  // Blocca lo scroll della pagina sottostante mentre la compilazione è aperta
  useEffect(() => {
    if (preview) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [preview]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  // ------------------------------------------------------------------ navigazione
  const goTo = useCallback((i: number, d: "next" | "prev") => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setDir(d);
    setErrorId(null);
    setStep(Math.max(0, Math.min(i, steps.length)));
    scroller.current?.scrollTo({ top: 0 });
    void save();
  }, [save, steps.length]);

  const next = useCallback(() => {
    if (isSummary) return;
    if (item?.required && !isAnswered(item, answersRef.current[item.id])) {
      setErrorId(item.id);
      try { navigator.vibrate?.([20, 40, 20]); } catch {}
      return;
    }
    goTo(step + 1, "next");
  }, [item, goTo, isSummary, step]);

  const prev = useCallback(() => { if (step > 0) goTo(step - 1, "prev"); }, [goTo, step]);

  const change = useCallback((it: Item, v: AnswerValue) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [it.id]: v }));
    setErrorId(null);
    if (!autoAdvances(it)) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const from = step;
    advanceTimer.current = setTimeout(() => {
      setDir("next");
      setStep((s) => (s === from ? s + 1 : s));
      scroller.current?.scrollTo({ top: 0 });
    }, AUTO_ADVANCE_MS);
  }, [step]);

  // Tastiera: Invio = avanti (fuori dalle aree di testo), cifre = risposta sulle scale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !["radio", "checkbox"].includes((t as HTMLInputElement).type));
      if (e.metaKey || e.ctrlKey || e.altKey || submitted) return;
      if (e.key === "Enter" && t.tagName !== "TEXTAREA" && t.tagName !== "BUTTON" && t.tagName !== "A" && !isSummary) {
        e.preventDefault();
        next();
        return;
      }
      if (!typing && item?.type === "scale") {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= item.min && n <= item.max) change(item, n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [change, isSummary, item, next, submitted]);

  // Swipe orizzontale tra le domande (non dentro diario, rubrica e campi di testo)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.target as HTMLElement;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ok: !t.closest("[data-noswipe], textarea, input") };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s?.ok || submitted) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 50) return;
    if (dx < 0) next();
    else prev();
  };

  // ------------------------------------------------------------------ chiusura e invio
  const close = () => {
    if (preview || !closeHref) return;
    start(async () => {
      await save();
      router.push(closeHref);
      router.refresh();
    });
  };

  const submit = () => {
    if (preview) {
      setSubmitted(true);
      return;
    }
    start(async () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const res = await saveAnswers(assignmentId, answersRef.current, true);
      if (res?.error) {
        setBanner(res.error);
        if (res.missing?.length) {
          const i = stepOfItem(res.missing[0]);
          if (i >= 0) {
            goTo(i, "prev");
            setErrorId(res.missing[0]);
          }
        }
        return;
      }
      dirty.current = false;
      setSubmitted(true);
    });
  };

  // ------------------------------------------------------------------ resa
  const missingRequired = answerable.filter((s) => s.item!.required && !isAnswered(s.item!, answers[s.item!.id]));
  const unansweredOptional = !!item && !item.required && !isAnswered(item, answers[item.id]);
  const primaryLabel = isSummary ? (pending ? "Invio…" : "Invia risposte")
    : !item ? "Ho letto, continua"
    : step === steps.length - 1 ? "Rivedi e invia"
    : unansweredOptional ? "Salta" : "Avanti";

  return (
    <div className={cx("flex flex-col bg-canvas text-ink", preview ? "relative h-[640px] overflow-hidden" : "fixed inset-0 z-50")}
      role={preview ? undefined : "dialog"} aria-modal={preview ? undefined : true} aria-label={title ?? "Questionario"}>

      {/* Barra superiore */}
      <header className="shrink-0 border-b border-line bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-3">
          <div className="w-11 shrink-0">
            {!submitted && closeHref && (
              <button type="button" onClick={close} disabled={pending || preview} aria-label="Chiudi e riprendi più tardi"
                className="grid h-11 w-11 place-items-center rounded-full text-wine hover:bg-blush disabled:opacity-40">
                <Icon name="close" className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-[13px] font-semibold text-wine-dark">{title ?? "Questionario"}</div>
            <div className="text-[11px] text-muted" aria-live="polite">
              {submitted ? "Consegnato" : isSummary ? "Riepilogo" : `${step + 1} di ${steps.length}`}
            </div>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center" aria-live="polite">
            {!preview && !submitted && <SaveIndicator state={saveState} />}
          </div>
        </div>
        <div className="h-1 bg-blush" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Avanzamento">
          <div className="h-full bg-wine transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {banner && !submitted && (
        <div role="alert" className="flex shrink-0 items-center gap-3 bg-[#fbeaec] px-4 py-2.5 text-[13px] text-[#a4434a]">
          <span className="flex-1">{banner}</span>
          <button type="button" onClick={() => setBanner(null)} aria-label="Chiudi avviso" className="grid h-8 w-8 place-items-center rounded-full"><Icon name="close" className="h-4 w-4" /></button>
        </div>
      )}

      {/* Contenuto */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={submitted ? "done" : step} className={cx("mx-auto max-w-xl px-5 pb-10 pt-7", dir === "next" ? "step-in-next" : "step-in-prev")}>
          {submitted ? (
            <CompletionScreen embedded title="Grazie!" href={preview ? undefined : doneHref}
              message={preview ? "Anteprima: in compilazione reale il questionario verrebbe consegnato." : doneMessage ?? DEFAULT_DONE} />
          ) : isSummary ? (
            <Summary content={content} answers={answers} missing={new Set(missingRequired.map((s) => s.item!.id))}
              onEdit={(id) => goTo(stepOfItem(id), "prev")} />
          ) : current && (
            <>
              <div className="eyebrow">{content.sections[current.sectionIdx].title}</div>
              {step === 0 && content.intro && <p className="mb-6 rounded-2xl bg-blush/70 p-4 text-[14px] leading-relaxed text-wine-dark">{content.intro}</p>}
              {current.firstOfSection && content.sections[current.sectionIdx].description && (
                <p className="mb-5 text-[13px] leading-relaxed text-muted">{content.sections[current.sectionIdx].description}</p>
              )}
              {current.infos.length > 0 && (
                <div className="mb-6 space-y-2.5">
                  {current.infos.map((i) => (
                    <div key={i.id} className="rounded-2xl border border-[#f2e3df] bg-[#faf4f2] p-4">
                      <div className="text-[15px] font-semibold text-wine-dark">{i.label}</div>
                      {i.help && <p className="mt-1 text-[14px] leading-relaxed text-[#59494a]">{i.help}</p>}
                    </div>
                  ))}
                </div>
              )}
              {item && (
                <fieldset>
                  <legend className="mb-1.5 font-serif text-[26px] leading-[1.2] text-wine-dark">{item.label}</legend>
                  <div className="mb-5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                    {!item.required && <span className="rounded-full bg-[#f2efed] px-2.5 py-0.5 text-[11px] font-semibold text-[#786e6b]">Facoltativa</span>}
                    {item.help && <span>{item.help}</span>}
                  </div>
                  <ItemInput item={item} value={answers[item.id]} onChange={(v) => change(item, v)} invalid={errorId === item.id} />
                  {errorId === item.id && (
                    <p role="alert" className="shake mt-3 text-[13px] font-semibold text-[#a4434a]">Rispondi per continuare.</p>
                  )}
                </fieldset>
              )}
            </>
          )}
        </div>
      </div>

      {/* Barra azioni */}
      {!submitted && (
        <footer className="shrink-0 border-t border-line bg-paper/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4">
            <button type="button" onClick={prev} disabled={step === 0 || pending} aria-label="Domanda precedente"
              className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border border-line bg-white text-wine transition active:scale-95 disabled:opacity-30">
              <Icon name="chevronLeft" className="h-5 w-5" />
            </button>
            <button type="button" onClick={isSummary ? submit : next} disabled={pending || (isSummary && missingRequired.length > 0)}
              className={cx("flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-40",
                unansweredOptional ? "border border-line bg-white text-wine" : "bg-wine text-white shadow-[0_8px_20px_rgba(116,45,67,.25)]")}>
              {primaryLabel}
              <Icon name={isSummary ? "send" : "chevron"} className="h-4 w-4" />
            </button>
          </div>
          {isSummary && missingRequired.length > 0 && (
            <p className="mx-auto mt-2 max-w-xl px-4 text-center text-xs text-[#a4434a]">
              {missingRequired.length === 1 ? "Manca 1 risposta obbligatoria" : `Mancano ${missingRequired.length} risposte obbligatorie`}: toccala nel riepilogo per completarla.
            </p>
          )}
          {!isSummary && step === 0 && answeredCount === 0 && !preview && (
            <p className="mx-auto mt-2 max-w-xl px-4 text-center text-[11px] text-muted">Le risposte si salvano da sole: puoi chiudere e riprendere quando vuoi.</p>
          )}
        </footer>
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="h-4 w-4 animate-spin rounded-full border-2 border-ln-200 border-t-wine" role="status" aria-label="Salvataggio in corso" />;
  if (state === "saved") return <span className="text-ok" role="status" aria-label="Bozza salvata" title="Bozza salvata"><Icon name="check" className="h-5 w-5" /></span>;
  if (state === "error") return <span className="grid h-6 w-6 place-items-center rounded-full bg-[#fbeaec] text-xs font-bold text-[#a4434a]" role="status" aria-label="Bozza non salvata" title="Bozza non salvata: riproverò alla prossima risposta">!</span>;
  return null;
}

function Summary({ content, answers, missing, onEdit }: { content: QuestionnaireContent; answers: Answers; missing: Set<string>; onEdit: (id: string) => void }) {
  return (
    <>
      <div className="eyebrow">Riepilogo</div>
      <h2 className="font-serif text-[30px] leading-tight text-wine-dark">Controlla e invia</h2>
      <p className="mb-6 mt-1.5 text-[13px] leading-relaxed text-muted">Tocca una risposta per modificarla. Dopo l’invio potrai cambiarla solo se l’insegnante riapre il questionario.</p>
      <div className="space-y-4">
        {content.sections.map((s) => {
          const items = s.items.filter((i) => i.type !== "info");
          if (!items.length) return null;
          return (
            <section key={s.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              <h3 className="border-b border-[#f2edeb] bg-[#fcfaf9] px-4 py-3 text-[13px] font-semibold text-wine-dark">{s.title}</h3>
              <ul>
                {items.map((i) => (
                  <li key={i.id} className="border-b border-[#f2edeb] last:border-b-0">
                    <button type="button" onClick={() => onEdit(i.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-[#fdf9f7]">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] leading-snug text-muted">{i.label}</span>
                        <span className={cx("mt-0.5 block text-[14px] font-medium", missing.has(i.id) && "text-[#a4434a]")}>
                          {missing.has(i.id) ? "Da completare" : <AnswerDisplay item={i} value={answers[i.id]} />}
                        </span>
                      </span>
                      <Icon name="edit" className="mt-1 h-4 w-4 shrink-0 text-ln-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {content.outro && <p className="callout mt-6 !text-[13px]">{content.outro}</p>}
    </>
  );
}
