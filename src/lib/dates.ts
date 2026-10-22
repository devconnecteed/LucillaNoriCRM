// Utilità per date relative e settimane (locale it-IT, settimana da lunedì).

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function startOfWeek(d: Date) {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // lunedì = 0
  s.setDate(s.getDate() - dow);
  return s;
}

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** "Oggi", "Domani", altrimenti il giorno della settimana (entro 6 giorni) o la data breve. */
export function relativeDay(d: Date, now = new Date()) {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400_000);
  if (diff === 0) return "Oggi";
  if (diff === 1) return "Domani";
  if (diff === -1) return "Ieri";
  if (diff > 1 && diff < 7) return capitalize(new Intl.DateTimeFormat("it-IT", { weekday: "long" }).format(d));
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(d);
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Nome abbreviato per contesti densi: "Giulia G." */
export const shortName = (first: string, last: string) => `${first} ${last.charAt(0)}.`;

/** "domani 23 ott 2026", "lunedì 26 ott 2026" oppure solo la data se lontana (niente ripetizioni). */
export function dayAndDate(d: Date, now = new Date()) {
  const date = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" }).format(d);
  const rel = relativeDay(d, now);
  return /\d/.test(rel) ? date : `${rel.toLowerCase()} ${date}`;
}
