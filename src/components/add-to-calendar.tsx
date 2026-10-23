import { Icon } from "./icons";
import { cx } from "./ui";

/** Menu "Aggiungi al calendario": Google Calendar (web) e Apple Calendar / Outlook (.ics). Funziona senza JavaScript. */
export function AddToCalendar({ links, compact, align = "right" }: { links: { google: string; ics: string } | null; compact?: boolean; align?: "left" | "right" }) {
  if (!links) return null;
  return (
    <details className="group relative inline-block">
      <summary className={cx("flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-line bg-white font-semibold text-[#654653] transition hover:shadow-soft [&::-webkit-details-marker]:hidden",
        compact ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-3.5 text-[13px]")}>
        <Icon name="calendar" className="h-4 w-4" />
        {compact ? "Calendario" : "Aggiungi al calendario"}
      </summary>
      <div className={cx("absolute z-30 mt-1.5 w-60 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_12px_40px_rgba(38,21,28,.14)]", align === "right" ? "right-0" : "left-0")}>
        <a href={links.google} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-[#fdf9f7]">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[#eaf3f9] text-[11px] font-bold text-info">G</span>
          Google Calendar
        </a>
        <a href={links.ics} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-[#fdf9f7]">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-blush text-wine"><Icon name="calendar" className="h-4 w-4" /></span>
          Apple Calendar / Outlook
        </a>
      </div>
    </details>
  );
}
