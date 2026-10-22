"use client";

import type { AnswerValue, Item } from "@/lib/questionnaire/types";
import { Icon } from "../icons";
import { cx } from "../ui";

type Props = { item: Item; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; invalid?: boolean; disabled?: boolean };

/** Leggera vibrazione di conferma sui dispositivi che la supportano (Android). */
const tap = () => {
  try {
    navigator.vibrate?.(8);
  } catch {}
};

const card =
  "flex min-h-14 w-full cursor-pointer select-none items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left text-[15px] leading-snug transition active:scale-[0.98] focus-within:ring-2 focus-within:ring-[#c89caa] motion-reduce:active:scale-100";
const cardOn = "border-wine bg-[#faf0f1] text-wine-dark";
const cardOff = "border-line bg-white text-ink hover:border-ln-300";

/**
 * Risposta a una domanda, pensata per il tocco: card grandi, scale a pulsanti, diario a chip.
 * Tutti gli input sono nativi (radio/checkbox) per accessibilità e navigazione da tastiera.
 */
export function ItemInput({ item, value, onChange, invalid, disabled }: Props) {
  const name = `item-${item.id}`;
  switch (item.type) {
    case "info":
      return null;

    case "text":
      return item.long ? (
        <textarea className="input min-h-40 !rounded-2xl !p-4 !text-base" name={name} value={(value as string) ?? ""} disabled={disabled}
          aria-invalid={invalid} placeholder="Scrivi qui la tua risposta…" onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input !min-h-14 !rounded-2xl !px-4 !text-base" name={name} value={(value as string) ?? ""} disabled={disabled}
          aria-invalid={invalid} placeholder="La tua risposta" enterKeyHint="next" onChange={(e) => onChange(e.target.value)} />
      );

    case "date":
      return (
        <input type="date" className="input !min-h-14 !rounded-2xl !px-4 !text-base" name={name} value={(value as string) ?? ""} disabled={disabled}
          aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} />
      );

    case "single":
      return (
        <div role="radiogroup" aria-invalid={invalid} className="space-y-2.5">
          {item.options.map((o, i) => {
            const on = value === o.id;
            return (
              <label key={o.id} className={cx(card, on ? cardOn : cardOff)}>
                <input type="radio" className="sr-only" name={name} value={o.id} checked={on} disabled={disabled}
                  onChange={() => { tap(); onChange(o.id); }} />
                <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", on ? "border-wine bg-wine" : "border-[#d9cbc8]")} aria-hidden="true">
                  {on && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                {item.options.length > 3 && <span className="font-semibold text-muted">{String.fromCharCode(65 + i)}</span>}
                <span className="flex-1">{o.label}</span>
              </label>
            );
          })}
        </div>
      );

    case "multiple": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2.5" role="group">
          <p className="text-xs text-muted">Puoi scegliere più risposte.</p>
          {item.options.map((o) => {
            const on = arr.includes(o.id);
            return (
              <label key={o.id} className={cx(card, on ? cardOn : cardOff)}>
                <input type="checkbox" className="sr-only" checked={on} disabled={disabled}
                  onChange={() => { tap(); onChange(on ? arr.filter((x) => x !== o.id) : [...arr, o.id]); }} />
                <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-md border-2", on ? "border-wine bg-wine text-white" : "border-[#d9cbc8]")} aria-hidden="true">
                  {on && <Icon name="check" className="h-4 w-4" />}
                </span>
                <span className="flex-1">{o.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case "scale":
      return <ScaleInput name={name} min={item.min} max={item.max} minLabel={item.minLabel} maxLabel={item.maxLabel} big
        value={typeof value === "number" ? value : undefined} onChange={(n) => { tap(); onChange(n); }} disabled={disabled} />;

    case "rubric": {
      const obj = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, number>;
      const done = item.criteria.filter((c) => typeof obj[c.id] === "number").length;
      return (
        <div className="space-y-3" data-noswipe>
          <p className="text-xs text-muted">{done} di {item.criteria.length} competenze valutate · {item.min} = {item.minLabel ?? "minimo"}, {item.max} = {item.maxLabel ?? "massimo"}</p>
          {item.criteria.map((c) => (
            <div key={c.id} className={cx("rounded-2xl border bg-white p-3.5", invalid && obj[c.id] === undefined ? "border-[#f3d7da]" : "border-line")}>
              <div className="mb-2.5 text-[14px] font-semibold">{c.label}</div>
              <ScaleInput name={`${name}-${c.id}`} min={item.min} max={item.max} value={obj[c.id]} disabled={disabled}
                onChange={(n) => { tap(); onChange({ ...obj, [c.id]: n }); }} />
            </div>
          ))}
        </div>
      );
    }

    case "diary": {
      const obj = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, string[]>;
      return (
        <div className="space-y-3" data-noswipe>
          {item.rows.map((r) => {
            const days = obj[r.id] ?? [];
            return (
              <fieldset key={r.id} className="rounded-2xl border border-line bg-white p-3.5">
                <legend className="sr-only">{r.label}</legend>
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold" aria-hidden="true">{r.label}</span>
                  <span className="text-xs text-muted">{days.length}/{item.days.length}</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {item.days.map((d) => {
                    const on = days.includes(d);
                    return (
                      <label key={d} className={cx("grid h-11 cursor-pointer select-none place-items-center rounded-xl border-2 text-xs font-semibold transition active:scale-95 focus-within:ring-2 focus-within:ring-[#c89caa]",
                        on ? "border-wine bg-wine text-white" : "border-line bg-[#faf8f7] text-[#7e6f70]")}>
                        <input type="checkbox" className="sr-only" checked={on} disabled={disabled} aria-label={`${r.label} – ${d}`}
                          onChange={() => { tap(); onChange({ ...obj, [r.id]: on ? days.filter((x) => x !== d) : [...days, d] }); }} />
                        {d}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      );
    }
  }
}

function ScaleInput({ name, min, max, minLabel, maxLabel, value, onChange, disabled, big }: {
  name: string; min: number; max: number; minLabel?: string; maxLabel?: string; value?: number;
  onChange: (v: number) => void; disabled?: boolean; big?: boolean;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div role="radiogroup" className="flex gap-2">
        {steps.map((n) => {
          const on = value === n;
          const aria = n === min && minLabel ? `${n} – ${minLabel}` : n === max && maxLabel ? `${n} – ${maxLabel}` : String(n);
          return (
            <label key={n} className={cx("flex flex-1 cursor-pointer select-none items-center justify-center rounded-2xl border-2 font-semibold transition active:scale-95 focus-within:ring-2 focus-within:ring-[#c89caa] motion-reduce:active:scale-100",
              big ? "h-16 text-xl" : "h-12 text-base", on ? "border-wine bg-wine text-white shadow-[0_6px_16px_rgba(116,45,67,.25)]" : "border-line bg-white text-ink hover:border-ln-300")}>
              <input type="radio" className="sr-only" name={name} value={n} checked={on} aria-label={aria} disabled={disabled} onChange={() => onChange(n)} />
              {n}
            </label>
          );
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div className="mt-2 flex justify-between gap-4 text-xs text-muted">
          <span>{min} · {minLabel}</span>
          <span className="text-right">{max} · {maxLabel}</span>
        </div>
      )}
    </div>
  );
}
