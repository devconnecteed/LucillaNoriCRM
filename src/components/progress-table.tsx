import type { ProgressColumn, ProgressRow } from "@/lib/progress";
import { Empty, cx, fmtDate } from "./ui";

function Trend({ values }: { values: (number | null)[] }) {
  const nums = values.filter((v): v is number => v !== null);
  const diff = nums.at(-1)! - nums[0];
  if (!diff) return <span className="text-[#aaa09d]">=</span>;
  return <span className={cx("font-semibold", diff > 0 ? "text-ok" : "text-warn")}>{diff > 0 ? `+${diff}` : diff}</span>;
}

export function ProgressTable({ columns, rows }: { columns: ProgressColumn[]; rows: ProgressRow[] }) {
  if (!rows.length) return <Empty>I confronti compaiono quando ci sono almeno due rilevazioni sulla stessa domanda.</Empty>;
  const groups: [string, ProgressRow[]][] = [
    ["Autovalutazione dell’allieva", rows.filter((r) => r.source === "self")],
    ["Competenze osservate dalla docente", rows.filter((r) => r.source === "teacher")],
  ];
  return (
    <div className="space-y-6">
      {groups.filter(([, r]) => r.length).map(([title, groupRows]) => {
        const cols = columns.map((c, i) => ({ c, i })).filter(({ i }) => groupRows.some((r) => r.values[i] !== null));
        return (
          <div key={title}>
            <h3 className="mb-2 text-sm font-semibold text-wine">{title}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="py-2 pr-3 text-left font-medium">Domanda</th>
                    {cols.map(({ c }) => <th key={c.responseId} className="px-2 py-2 text-center font-medium" title={c.title}>{fmtDate(c.date)}<div className="max-w-28 truncate font-normal">{c.title}</div></th>)}
                    <th className="px-2 py-2 text-center font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map((r) => (
                    <tr key={r.key} className="border-t border-[#f2edeb]">
                      <td className="py-2 pr-3">{r.label}</td>
                      {cols.map(({ i }) => <td key={i} className="px-2 py-2 text-center">{r.values[i] ?? "–"}</td>)}
                      <td className="px-2 py-2 text-center"><Trend values={r.values} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
