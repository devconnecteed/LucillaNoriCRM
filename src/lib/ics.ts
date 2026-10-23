// Generazione iCalendar (RFC 5545) per lezioni: file .ics allegati alle email, download
// "Apple / Outlook" e calendario in abbonamento. Orari sempre in UTC (suffisso Z).

export type CalendarEvent = {
  uid: string;
  start: Date;
  end: Date;
  title: string;
  description?: string;
  location?: string | null;
  url?: string;
  sequence?: number;
  cancelled?: boolean;
};

/** 20261023T083000Z */
export const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escape dei caratteri speciali nei testi (virgole, punti e virgola, a capo, backslash). */
export const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Righe al massimo di 75 ottetti: le successive iniziano con uno spazio (line folding). */
export function fold(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, "utf8");
    const limit = parts.length ? 74 : 75; // la riga di continuazione ha già lo spazio iniziale
    if (size + n > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildCalendar(events: CalendarEvent[], opts: { name?: string; method?: "PUBLISH" } = {}) {
  const now = icsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LN Stile e Portamento//LN Studio//IT",
    "CALSCALE:GREGORIAN",
    `METHOD:${opts.method ?? "PUBLISH"}`,
    ...(opts.name ? [`X-WR-CALNAME:${icsText(opts.name)}`, "X-PUBLISHED-TTL:PT1H", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"] : []),
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.end)}`,
      `SEQUENCE:${e.sequence ?? 0}`,
      `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
      `SUMMARY:${icsText(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${icsText(e.description)}`] : []),
      ...(e.location ? [`LOCATION:${icsText(e.location)}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []),
      // Promemoria 1 giorno e 1 ora prima
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(e.title)}`, "TRIGGER:-P1D", "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(e.title)}`, "TRIGGER:-PT1H", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Link "Aggiungi a Google Calendar" (crea l'evento nell'account Google di chi lo apre). */
export function googleCalendarUrl(e: Pick<CalendarEvent, "start" | "end" | "title" | "description" | "location">) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${icsDate(e.start)}/${icsDate(e.end)}`,
    ...(e.description ? { details: e.description } : {}),
    ...(e.location ? { location: e.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
