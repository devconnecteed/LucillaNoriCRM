import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { cx } from "../ui";

/**
 * Schermata finale a tutto schermo della compilazione (consegnato, scaduto…).
 * Usata sia dal form dopo l'invio sia dalla pagina quando il questionario è già chiuso.
 */
export function CompletionScreen({ title, message, href, cta = "Fatto", icon = "check", tone = "ok", embedded }: {
  title: string; message: string; href?: string; cta?: string; icon?: IconName; tone?: "ok" | "warn"; embedded?: boolean;
}) {
  const body = (
    <div className="flex flex-col items-center px-6 text-center">
      <div className={cx("pop-in grid h-24 w-24 place-items-center rounded-full", tone === "ok" ? "bg-blush text-wine" : "bg-warn-bg text-warn")}>
        <Icon name={icon} className="h-12 w-12" />
      </div>
      <h1 className="mt-6 font-serif text-[34px] leading-tight text-wine-dark">{title}</h1>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">{message}</p>
      {href && (
        <Link href={href} className="mt-8 flex h-[52px] w-full max-w-xs items-center justify-center rounded-2xl bg-wine text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(116,45,67,.25)] active:scale-[0.98]">
          {cta}
        </Link>
      )}
    </div>
  );
  if (embedded) return <div className="flex min-h-[60vh] items-center justify-center">{body}</div>;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">{body}</div>
  );
}
