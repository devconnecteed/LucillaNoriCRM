import { Icon } from "./icons";
import { cx } from "./ui";

/**
 * Abbonamento al calendario personale: tutte le lezioni compaiono e si aggiornano da sole
 * in Apple Calendar (webcal) e Google Calendar (aggiungi da URL).
 */
export function SubscribeCalendar({ urls, label = "Sincronizza calendario", align = "right" }: {
  urls: { https: string; webcal: string }; label?: string; align?: "left" | "right";
}) {
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(urls.webcal)}`;
  return (
    <details className="group relative inline-block">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-[#654653] transition hover:shadow-soft [&::-webkit-details-marker]:hidden">
        <Icon name="calendar" className="h-4 w-4" /> {label}
      </summary>
      <div className={cx("absolute z-30 mt-1.5 w-[300px] rounded-xl border border-line bg-white p-4 text-[13px] shadow-[0_12px_40px_rgba(38,21,28,.14)]", align === "right" ? "right-0" : "left-0")}>
        <p className="mb-3 text-xs leading-relaxed text-muted">Iscriviti una volta: le lezioni nuove o spostate compariranno da sole nel tuo calendario.</p>
        <a href={urls.webcal} className="mb-2 flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 hover:bg-[#fdf9f7]">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-blush text-wine"><Icon name="calendar" className="h-4 w-4" /></span>
          Apple Calendar (iPhone, Mac)
        </a>
        <a href={google} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 hover:bg-[#fdf9f7]">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[#eaf3f9] text-[11px] font-bold text-info">G</span>
          Google Calendar
        </a>
        <label className="mt-3 block text-[11px] text-muted">
          Indirizzo per altri calendari (Outlook…)
          <input readOnly value={urls.https} className="input mt-1 !min-h-9 !py-1.5 font-mono !text-[11px]" />
        </label>
        <p className="mt-2 text-[11px] text-muted">Il link è personale: non condividerlo.</p>
      </div>
    </details>
  );
}
