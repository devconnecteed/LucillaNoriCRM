import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-ln-700 text-white hover:bg-ln-800 shadow-sm",
  secondary: "bg-white text-ln-800 border border-ln-200 hover:bg-ln-50",
  ghost: "text-ln-700 hover:bg-ln-50",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none min-h-10";

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(btnBase, variants[variant], className)} {...p} />;
}

export function ButtonLink({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(btnBase, variants[variant], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("rounded-2xl border border-stone-200 bg-white p-5 shadow-sm", className)} {...p} />;
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ln-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tones = {
  neutral: "bg-stone-100 text-stone-700",
  pink: "bg-ln-100 text-ln-800",
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-800",
};
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function statusTone(status: string): keyof typeof tones {
  if (["COMPLETED", "PUBLISHED", "ACTIVE", "SUBMITTED"].includes(status)) return "green";
  if (["IN_PROGRESS", "OPENED", "RUNNING", "REOPENED"].includes(status)) return "blue";
  if (["SENT", "DRAFT", "PLANNED", "NOT_STARTED"].includes(status)) return "amber";
  if (["EXPIRED", "INTERRUPTED", "CANCELLED", "ARCHIVED", "REVOKED"].includes(status)) return "red";
  return "neutral";
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">{children}</div>;
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-ln-50 text-xs uppercase tracking-wide text-ln-800">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...p }: ComponentProps<"td">) {
  return <td className={cx("px-4 py-3 align-top", className)} {...p} />;
}

export function Stat({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const inner = (
    <Card className="h-full transition hover:border-ln-300">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-2 font-serif text-3xl text-ln-800">{value}</div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="leading-none">
      <div className={cx("font-serif font-bold tracking-tight text-ln-700", small ? "text-xl" : "text-4xl")}>L N</div>
      <div className={cx("uppercase tracking-[0.3em] text-stone-500", small ? "text-[9px]" : "text-xs")}>Stile e Portamento</div>
    </div>
  );
}

export const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(d) : "—";

export const fmtDateTime = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(d) : "—";

export { cx };
