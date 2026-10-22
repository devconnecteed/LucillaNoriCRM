import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./icons";

// Componenti base del design system LN Studio: un solo sistema di card, tabelle,
// moduli, badge, pulsanti, stati e messaggi (tavola 02 · Coerenza).

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
const variants: Record<Variant, string> = {
  primary: "border-wine bg-wine text-white hover:bg-wine-dark",
  secondary: "border-line bg-white text-[#654653] hover:shadow-soft",
  ghost: "border-transparent bg-transparent text-wine hover:bg-ln-50",
  danger: "border-[#f3d7da] bg-white text-[#a4434a] hover:bg-[#fdf3f4]",
  soft: "border-[#f6ecec] bg-[#f6ecec] text-wine hover:bg-blush",
};
const btnBase =
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2 text-[13px] font-semibold transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-40 motion-reduce:hover:translate-y-0";
const tiny = "min-h-8 px-2.5 py-1 text-xs";

type BtnExtra = { variant?: Variant; icon?: IconName; size?: "md" | "sm" };

export function Button({ variant = "primary", icon, size = "md", className, children, ...p }: ComponentProps<"button"> & BtnExtra) {
  return (
    <button className={cx(btnBase, variants[variant], size === "sm" && tiny, className)} {...p}>
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", icon, size = "md", className, children, ...p }: ComponentProps<typeof Link> & BtnExtra) {
  return (
    <Link className={cx(btnBase, variants[variant], size === "sm" && tiny, className)} {...p}>
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </Link>
  );
}

/** Pannello bianco (card). */
export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("min-w-0 rounded-xl border border-line bg-white p-5 shadow-soft sm:p-6", className)} {...p} />;
}

/** Titolo di pannello: serif + azione a destra. */
export function PanelTitle({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-5 flex items-center justify-between gap-3", className)}>
      <h2 className="font-serif text-[23px] leading-tight text-wine-dark">{title}</h2>
      {action && <div className="shrink-0 text-[13px] font-semibold text-wine">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="font-serif text-[32px] leading-[1.15] tracking-[-0.01em] text-wine-dark sm:text-[38px]">{title}</h1>
        {subtitle && <div className="mt-2.5 text-[13px] leading-relaxed text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Intestazione di sezione all'interno di una pagina. */
export function SectionHead({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 mt-9 flex items-center justify-between gap-3">
      <h2 className="font-serif text-[26px] leading-tight text-wine-dark">{title}</h2>
      {action}
    </div>
  );
}

const tones = {
  neutral: "bg-[#f2efed] text-[#786e6b]",
  pink: "bg-blush text-wine",
  green: "bg-ok-bg text-ok",
  amber: "bg-warn-bg text-warn",
  red: "bg-[#fbeaec] text-[#a4434a]",
  blue: "bg-info-bg text-info",
};
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", tones[tone])}>{children}</span>;
}

export function statusTone(status: string): Tone {
  if (["COMPLETED", "PUBLISHED", "ACTIVE", "SUBMITTED", "ACCEPTED"].includes(status)) return "green";
  if (["IN_PROGRESS", "OPENED", "RUNNING", "REOPENED", "SENT"].includes(status)) return "blue";
  if (["DRAFT", "PLANNED", "NOT_STARTED"].includes(status)) return "amber";
  if (["EXPIRED", "INTERRUPTED", "CANCELLED", "ARCHIVED", "REVOKED", "DECLINED"].includes(status)) return "red";
  return "neutral";
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cx("block min-w-0", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

/** Intestazione numerata delle sezioni di un modulo ("01 / DATI ANAGRAFICI"). */
export function FormStep({ n, title, description }: { n: number; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <div className="eyebrow mb-1">{String(n).padStart(2, "0")} / {title}</div>
      {description && <p className="text-xs text-muted">{description}</p>}
    </div>
  );
}

export function Empty({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#e0d3cf] bg-[#faf8f7] px-5 py-8 text-center text-[13px] text-muted">
      {icon && <Icon name={icon} className="h-6 w-6 text-ln-400" />}
      {children}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-soft">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className="border-b border-[#eee7e3] bg-[#fcfaf9] px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#978786]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:hover]:bg-[#fdf9f7] [&>tr:last-child>td]:border-b-0">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...p }: ComponentProps<"td">) {
  return <td className={cx("border-b border-[#f1ece9] px-5 py-4 align-middle", className)} {...p} />;
}

export function Stat({ label, value, href, hint, icon, hintTone = "ok" }: {
  label: string; value: ReactNode; href?: string; hint?: ReactNode; icon?: IconName; hintTone?: "ok" | "wine" | "muted";
}) {
  const inner = (
    <div className="h-full min-h-[118px] rounded-xl border border-line bg-white p-5 shadow-soft transition hover:border-ln-300">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#948a86]">{label}</div>
        {icon && <Icon name={icon} className="h-[18px] w-[18px] text-ln-400" />}
      </div>
      <div className="mt-1 font-serif text-[38px] leading-snug text-wine-dark">{value}</div>
      {hint && <div className={cx("text-xs", hintTone === "ok" ? "text-ok" : hintTone === "wine" ? "text-wine" : "text-muted")}>{hint}</div>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

/** Filtri a pillola (link GET). */
export function FilterChips({ items, active }: { items: { href: string; label: ReactNode; value: string }[]; active: string }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filtri">
      {items.map((i) => (
        <Link key={i.value} href={i.href} aria-current={i.value === active ? "page" : undefined}
          className={cx("rounded-full border px-4 py-2 text-xs font-semibold transition",
            i.value === active ? "border-[#bfa6ac] bg-[#faf0f1] text-wine" : "border-line bg-white text-[#7e6f70] hover:border-ln-300")}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Tab di pagina (link GET, quindi condivisibili e funzionanti senza JavaScript). */
export function Tabs({ items, active }: { items: { href: string; label: ReactNode; value: string }[]; active: string }) {
  return (
    <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line px-1" aria-label="Sezioni">
      {items.map((i) => (
        <Link key={i.value} href={i.href} scroll={false} aria-current={i.value === active ? "page" : undefined}
          className={cx("-mb-px whitespace-nowrap border-b-2 px-3.5 pb-3 pt-2 text-[13px]",
            i.value === active ? "border-wine font-bold text-wine" : "border-transparent text-[#897d7b] hover:text-wine")}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Data in riquadro (giorno + mese). */
export function DateBox({ date }: { date: Date }) {
  return (
    <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-lg border border-[#f2e7e0] bg-[#faf3ee] text-wine">
      <div className="text-center leading-none">
        <div className="font-serif text-2xl">{date.getDate()}</div>
        <div className="mt-0.5 text-[9px] uppercase tracking-widest">{new Intl.DateTimeFormat("it-IT", { month: "short" }).format(date).replace(".", "")}</div>
      </div>
    </div>
  );
}

/** Iniziali in riquadro (allieve). */
export function Initials({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <div className={cx("grid shrink-0 place-items-center rounded-[11px] bg-[#f5e8e5] font-serif text-wine",
      size === "lg" ? "h-14 w-14 text-2xl" : "h-9 w-9 text-[17px]")} aria-hidden="true">{ini}</div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <span className="inline-block h-[5px] w-24 overflow-hidden rounded-full bg-[#f0e9e6]" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <span className="block h-full rounded-full bg-wine-light" style={{ width: `${v}%` }} />
      </span>
      <span className="text-xs text-muted">{v}%</span>
    </span>
  );
}

/** Riga con icona, titolo, testo e orario (pannello "La tua attenzione"). */
export function ActivityItem({ icon, title, text, time, href }: { icon: IconName; title: ReactNode; text?: ReactNode; time?: ReactNode; href?: string }) {
  const body = (
    <div className="flex items-start gap-3.5 border-b border-[#f2edeb] py-3.5 last:border-b-0">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#faf0f0] text-wine"><Icon name={icon} className="h-[17px] w-[17px]" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{title}</div>
        {text && <div className="mt-1 text-xs leading-relaxed text-muted">{text}</div>}
      </div>
      {time && <div className="shrink-0 whitespace-nowrap text-[11px] text-[#ab9d98]">{time}</div>}
    </div>
  );
  return href ? <Link href={href} className="block hover:bg-[#fdf9f7]">{body}</Link> : body;
}

export function Logo({ small, light }: { small?: boolean; light?: boolean }) {
  if (small)
    return (
      <div className="flex items-center gap-3">
        <div className={cx("font-serif text-[34px] leading-none tracking-[-0.06em]", light ? "text-white" : "text-wine")}>LN</div>
        <div>
          <div className={cx("font-serif text-[17px] leading-none", light ? "text-white" : "text-wine-dark")}>Lucilla Nori</div>
          <div className={cx("mt-1.5 text-[8px] tracking-[0.3em]", light ? "text-white/70" : "text-[#877d7a]")}>STILE E PORTAMENTO</div>
        </div>
      </div>
    );
  return (
    <div className="leading-none">
      <div className={cx("font-serif text-5xl tracking-[-0.06em]", light ? "text-white" : "text-wine")}>LN</div>
      <div className={cx("mt-2 text-[10px] tracking-[0.35em]", light ? "text-white/70" : "text-muted")}>STILE E PORTAMENTO</div>
    </div>
  );
}

export const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" }).format(d) : "—";

export const fmtDateTime = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(d) : "—";

/** Orario "10:30" se la data ha un orario impostato, altrimenti null. */
export const fmtTime = (d: Date | null | undefined) =>
  d && (d.getHours() || d.getMinutes()) ? new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(d) : null;

export { cx };

/** Stepper orizzontale (editor modelli). */
export function Stepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="mb-7 flex items-center gap-2" aria-label="Avanzamento">
      {steps.map((s, i) => {
        const state = i < active ? "done" : i === active ? "current" : "todo";
        return (
          <li key={s} aria-current={state === "current" ? "step" : undefined}
            className={cx("flex flex-1 items-center gap-2.5 text-xs font-bold last:flex-none",
              state === "todo" ? "text-[#b3a5a2]" : "text-wine",
              "after:h-px after:flex-1 after:bg-line last:after:hidden")}>
            <span className={cx("grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border",
              state === "todo" ? "border-[#ded0cb] text-[#9b8a88]" : "border-wine bg-wine text-white")}>
              {state === "done" ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
