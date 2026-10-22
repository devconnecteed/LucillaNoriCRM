import type { SVGProps } from "react";

// Icone lineari del prototipo LN Studio (stroke 1.7, viewBox 24).
const paths = {
  dashboard: <><rect x="3" y="3" width="7" height="8" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="15" width="7" height="6" rx="1" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 8a3 3 0 0 1 0 6M17 16a5 5 0 0 1 4 4" /></>,
  book: <><path d="M4 4.5C4 3.7 5 3 6 3h14v16H6a2 2 0 0 0 0 4h14M4 4.5V21" /><path d="M8 7h8M8 11h6" /></>,
  file: <path d="M6 2h9l4 4v16H6zM15 2v5h4M9 13h7M9 17h7" />,
  clipboard: <><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4" /></>,
  chart: <path d="M3 20h18M6 17v-6M12 17V6M18 17V10" />,
  award: <><circle cx="12" cy="8" r="5" /><path d="m9 13-1 8 4-3 4 3-1-8" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v5M17 3v5M3 10h18" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  search: <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 5 5" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  download: <path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" />,
  check: <path d="m5 12 5 5L20 7" />,
  send: <path d="m22 2-7 20-4-9-9-4zM11 13 22 2" />,
  edit: <path d="m16 4 4 4M4 20l5-.9 11-11a3 3 0 0 0-4-4L5 15z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  logout: <path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3" />,
  euro: <path d="M18 6.5A7 7 0 1 0 18 17.5M4 10h10M4 14h10" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-[18px] w-[18px]", ...p }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={`shrink-0 ${className}`} {...p}>
      {paths[name]}
    </svg>
  );
}
