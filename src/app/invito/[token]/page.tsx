import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { InviteForm } from "@/components/auth-forms";
import { Card, Logo } from "@/components/ui";

export const metadata = { title: "Attiva accesso" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  const valid = invite && !invite.usedAt && invite.expiresAt > new Date() && invite.user.active;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-ln-100 to-ivory px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-8 text-center"><Logo /></div>
        {valid ? (
          <>
            <h1 className="mb-2 text-center font-serif text-xl text-ln-900">Benvenuta, {invite.user.name.split(" ")[0]}</h1>
            <p className="mb-6 text-center text-sm text-stone-600">Imposta la password per accedere alla tua area riservata ({invite.user.email}).</p>
            <InviteForm token={token} />
          </>
        ) : (
          <p className="text-center text-sm text-stone-700">
            Questo invito non è più valido o è già stato utilizzato. Chiedi alla tua insegnante di inviartene uno nuovo,
            oppure <a className="text-ln-700 underline" href="/login">accedi</a> se hai già attivato l’account.
          </p>
        )}
      </Card>
    </main>
  );
}
