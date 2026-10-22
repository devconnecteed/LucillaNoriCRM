"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "./ui";

export type NavItem = { href: string; label: string };

export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/docente" ? path === href : path.startsWith(href));
  return (
    <>
      <button type="button" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm lg:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Menu
      </button>
      <nav className={cx("w-full lg:block", open ? "block" : "hidden")} aria-label="Navigazione principale">
        <ul className="mt-3 space-y-1 lg:mt-0">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} onClick={() => setOpen(false)} aria-current={active(i.href) ? "page" : undefined}
                className={cx("block rounded-lg px-3 py-2 text-sm font-medium transition",
                  active(i.href) ? "bg-ln-700 text-white" : "text-stone-700 hover:bg-ln-50 hover:text-ln-800")}>
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
