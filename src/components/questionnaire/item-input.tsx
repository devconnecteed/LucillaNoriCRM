"use client";

import type { AnswerValue, Item } from "@/lib/questionnaire/types";
import { cx } from "../ui";

type Props = { item: Item; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; invalid?: boolean; disabled?: boolean };

const pill =
  "min-h-11 rounded-xl border px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-ln-300 cursor-pointer select-none";
const pillOn = "border-ln-600 bg-ln-700 text-white shadow-sm";
const pillOff = "border-[#e0d3cf] bg-white text-ink hover:border-ln-400";

/** Rendering di una singola domanda. Tutti gli input sono nativi (radio/checkbox) per accessibilità e tastiera. */
export function ItemInput({ item, value, onChange, invalid, disabled }: Props) {
  const name = `item-${item.id}`;
  switch (item.type) {
    case "info":
      return null;

    case "text":
      return item.long ? (
        <textarea className="input min-h-28" name={name} value={(value as string) ?? ""} disabled={disabled}
          aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" name={name} value={(value as string) ?? ""} disabled={disabled}
          aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} />
      );

    case "date":
      return (
        <input type="date" className="input max-w-xs" name={name} value={(value as string) ?? ""} disabled={disabled}
          aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} />
      );

    case "single":
      return (
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          {item.options.map((o, i) => {
            const on = value === o.id;
            return (
              <label key={o.id} className={cx(pill, "flex items-start gap-2", on ? pillOn : pillOff)}>
                <input type="radio" className="sr-only" name={name} value={o.id} checked={on} disabled={disabled}
                  onChange={() => onChange(o.id)} />
                {item.options.length > 3 && <span className="font-semibold">{String.fromCharCode(65 + i)})</span>}
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      );

    case "multiple": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {item.options.map((o) => {
            const on = arr.includes(o.id);
            return (
              <label key={o.id} className={cx(pill, "flex items-center gap-2", on ? pillOn : pillOff)}>
                <input type="checkbox" className="h-4 w-4 accent-white" checked={on} disabled={disabled}
                  onChange={() => onChange(on ? arr.filter((x) => x !== o.id) : [...arr, o.id])} />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case "scale":
      return <ScaleInput name={name} min={item.min} max={item.max} minLabel={item.minLabel} maxLabel={item.maxLabel}
        value={typeof value === "number" ? value : undefined} onChange={onChange} disabled={disabled} />;

    case "rubric": {
      const obj = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, number>;
      return (
        <div className="space-y-4">
          {item.criteria.map((c) => (
            <div key={c.id} className="rounded-xl bg-[#faf8f7] p-3">
              <div className={cx("mb-2 text-sm font-medium", invalid && obj[c.id] === undefined && "text-[#a4434a]")}>{c.label}</div>
              <ScaleInput name={`${name}-${c.id}`} min={item.min} max={item.max} minLabel={item.minLabel} maxLabel={item.maxLabel}
                value={obj[c.id]} disabled={disabled} onChange={(n) => onChange({ ...obj, [c.id]: n as number })} />
            </div>
          ))}
        </div>
      );
    }

    case "diary": {
      const obj = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, string[]>;
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr>
                <th className="py-2 pr-2 text-left font-medium text-muted">Esercizio</th>
                {item.days.map((d) => <th key={d} className="px-1 py-2 text-center font-medium text-muted">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {item.rows.map((r) => (
                <tr key={r.id} className="border-t border-[#f2edeb]">
                  <td className="py-2 pr-2">{r.label}</td>
                  {item.days.map((d) => {
                    const on = obj[r.id]?.includes(d) ?? false;
                    return (
                      <td key={d} className="px-1 py-2 text-center">
                        <input type="checkbox" aria-label={`${r.label} – ${d}`} className="h-6 w-6 accent-[var(--color-ln-700)]"
                          checked={on} disabled={disabled}
                          onChange={() => {
                            const cur = obj[r.id] ?? [];
                            onChange({ ...obj, [r.id]: on ? cur.filter((x) => x !== d) : [...cur, d] });
                          }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

function ScaleInput({ name, min, max, minLabel, maxLabel, value, onChange, disabled }: {
  name: string; min: number; max: number; minLabel?: string; maxLabel?: string; value?: number;
  onChange: (v: number) => void; disabled?: boolean;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div role="radiogroup" className="flex gap-2">
        {steps.map((n) => {
          const on = value === n;
          const aria = n === min && minLabel ? `${n} – ${minLabel}` : n === max && maxLabel ? `${n} – ${maxLabel}` : String(n);
          return (
            <label key={n} className={cx(pill, "flex flex-1 items-center justify-center font-semibold", on ? pillOn : pillOff)}>
              <input type="radio" className="sr-only" name={name} value={n} checked={on} aria-label={aria} disabled={disabled}
                onChange={() => onChange(n)} />
              {n}
            </label>
          );
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{min} = {minLabel}</span>
          <span>{max} = {maxLabel}</span>
        </div>
      )}
    </div>
  );
}
