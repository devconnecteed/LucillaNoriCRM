import Link from "next/link";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { InviteForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Attiva l’accesso" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  const valid = invite && !invite.usedAt && invite.expiresAt > new Date() && invite.user.active;
  return (
    <AuthShell tagline="Ogni allieva ha un percorso unico. Da qui potrai seguirlo, passo dopo passo.">
      {valid ? (
        <>
          <div className="eyebrow">Attiva il tuo accesso</div>
          <h1 className="mb-2 font-serif text-[36px] leading-tight text-wine-dark">Benvenuta, {invite.user.name.split(" ")[0]}.</h1>
          <p className="mb-8 text-[13px] text-muted">Scegli una password per entrare nella tua area riservata ({invite.user.email}).</p>
          <InviteForm token={token} />
        </>
      ) : (
        <>
          <h1 className="mb-3 font-serif text-[30px] leading-tight text-wine-dark">Invito non più valido</h1>
          <p className="text-[13px] leading-relaxed text-muted">
            Il link è scaduto o è già stato usato. Chiedi alla tua insegnante di inviartene uno nuovo,
            oppure <Link className="font-semibold text-wine underline" href="/login">accedi</Link> se hai già attivato l’account.
          </p>
        </>
      )}
    </AuthShell>
  );
}
