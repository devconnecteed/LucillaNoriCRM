"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { Logo, cx } from "./ui";

export type NavItem = { href: string; label: string; icon: IconName; count?: number };
export type NavGroup = { caption: string; items: NavItem[] };

const isActive = (path: string, href: string) => (href === "/docente" ? path === href : path.startsWith(href));

/** Sidebar persistente su desktop, cassetto a scomparsa su mobile (tavola 14 · Handoff). */
export function AppShell({ groups, footer, children }: { groups: NavGroup[]; footer: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-dvh">
      {/* Barra mobile */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <button type="button" aria-label="Apri il menu" aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg text-wine"><Icon name="menu" className="h-6 w-6" /></button>
        <Link href="/docente" className="font-serif text-xl text-wine">LN <span className="text-[11px] tracking-[0.2em]">STUDIO</span></Link>
        <Link href="/docente/cerca" aria-label="Cerca" className="grid h-10 w-10 place-items-center rounded-lg text-wine"><Icon name="search" /></Link>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-[rgba(36,26,30,.35)] lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside id="sidebar"
        className={cx("fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-line bg-paper px-[18px] pb-5 pt-7 transition-transform lg:translate-x-0",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-[105%]")}>
        <div className="mb-8 flex items-center justify-between px-2.5">
          <Link href="/docente"><Logo small /></Link>
          <button type="button" aria-label="Chiudi il menu" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f8eff0] text-wine lg:hidden">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <nav aria-label="Navigazione principale" className="-mx-1 flex-1 overflow-y-auto px-1">
          {groups.map((g) => (
            <div key={g.caption}>
              <div className="mx-4 mb-2.5 mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#aa9999]">{g.caption}</div>
              <ul className="flex flex-col gap-0.5">
                {g.items.map((i) => {
                  const active = isActive(path, i.href);
                  return (
                    <li key={i.href}>
                      <Link href={i.href} aria-current={active ? "page" : undefined}
                        className={cx("relative flex items-center gap-3 rounded-[9px] px-3.5 py-3 text-[13px] transition",
                          active ? "bg-blush font-bold text-wine-dark before:absolute before:-left-[9px] before:h-[26px] before:w-[3px] before:rounded before:bg-wine"
                            : "font-medium text-[#62585a] hover:bg-[#f8f0f0] hover:text-wine")}>
                        <Icon name={i.icon} />
                        {i.label}
                        {!!i.count && <span className="ml-auto min-w-[22px] rounded-full bg-[#f2e5e6] px-1.5 py-0.5 text-center text-[10px] text-wine" aria-label={`${i.count} da fare`}>{i.count}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-4 border-t border-line pt-4">{footer}</div>
      </aside>

      <div className="lg:ml-[260px]">{children}</div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  allieve: "Allieve",
  corsi: "Percorsi e corsi",
  calendario: "Calendario",
  questionari: "Questionari",
  valutazioni: "Valutazioni",
  compilazioni: "Valutazioni",
  compila: "Valutazioni",
  attestati: "Attestati",
  preventivi: "Preventivi",
  cerca: "Ricerca",
  tipologie: "Tipologie",
  edizioni: "Edizioni",
  nuova: "Nuova",
  nuovo: "Nuovo",
  assegna: "Assegna",
  pianifica: "Pianifica lezione",
};
/** Segmenti senza una pagina propria: il link punta alla sezione che li contiene. */
const HREF_ALIASES: Record<string, string> = {
  "/docente/compilazioni": "/docente/valutazioni",
  "/docente/compila": "/docente/valutazioni",
  "/docente/corsi/tipologie": "/docente/corsi",
  "/docente/corsi/edizioni": "/docente/corsi",
};

/** Breadcrumb di contesto ricavata dall'URL (fino a tre livelli: es. Percorsi e corsi › Preventivi › Dettaglio). */
export function Breadcrumb() {
  const path = usePathname();
  const segments = path.split("/").slice(2).filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [{ label: "LN Studio", href: "/docente" }];
  if (!segments.length) crumbs.push({ label: "Panoramica" });
  segments.forEach((seg, i) => {
    const href = `/docente/${segments.slice(0, i + 1).join("/")}`;
    crumbs.push({ label: LABELS[seg] ?? "Dettaglio", href: HREF_ALIASES[href] ?? href });
  });
  return (
    <nav aria-label="Percorso" className="flex min-w-0 items-center gap-2.5 text-xs text-[#938987]">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-2.5">
          {i > 0 && <Icon name="chevron" className="h-3 w-3" />}
          {c.href && i < crumbs.length - 1 ? <Link className="hover:text-wine" href={c.href}>{c.label}</Link> : <b className="truncate font-semibold text-wine-dark">{c.label}</b>}
        </span>
      ))}
    </nav>
  );
}
