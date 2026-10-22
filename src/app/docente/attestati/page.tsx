import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { enrollmentWhereForStaff, getEnrollmentForStaff } from "@/lib/guards";
import { certificateRequirements } from "@/lib/certificates";
import { issueCertificate, revokeCertificate } from "@/server/certificates";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, Card, Empty, Field, PageHeader, Table, Td, fmtDate } from "@/components/ui";

export const metadata = { title: "Attestati" };

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<{ iscrizione?: string }> }) {
  const user = await requireStaff();
  const { iscrizione } = await searchParams;
  const scope = enrollmentWhereForStaff(user);

  const [candidates, certificates] = await Promise.all([
    db.enrollment.findMany({
      where: { ...scope, certificates: { none: { revokedAt: null } }, status: { not: "INTERRUPTED" } },
      include: { student: true, edition: true },
      orderBy: { createdAt: "desc" },
    }),
    db.certificate.findMany({ where: { enrollment: scope }, include: { enrollment: { include: { student: true } } }, orderBy: { issuedAt: "desc" } }),
  ]);

  let req: Awaited<ReturnType<typeof certificateRequirements>> | null = null;
  if (iscrizione) {
    await getEnrollmentForStaff(user, iscrizione);
    req = await certificateRequirements(iscrizione);
  }

  return (
    <>
      <PageHeader title="Attestati di partecipazione" subtitle="Emissione dopo verifica di presenze e completamento; annullamenti tracciati." />

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-serif text-lg text-ln-900">1 · Scegli il percorso</h2>
          {candidates.length ? (
            <ul className="divide-y divide-stone-100 text-sm">
              {candidates.map((e) => (
                <li key={e.id}>
                  <Link href={`?iscrizione=${e.id}`} className={`flex justify-between gap-2 py-2 ${e.id === iscrizione ? "font-semibold text-ln-800" : "hover:text-ln-700"}`}>
                    <span>{e.student.firstName} {e.student.lastName} · {e.edition.title}</span>
                    {e.status === "COMPLETED" ? <Badge tone="green">Completato</Badge> : <Badge>In corso</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>Nessun percorso senza attestato.</Empty>}
        </Card>

        <Card>
          <h2 className="mb-3 font-serif text-lg text-ln-900">2 · Verifica ed emetti</h2>
          {req ? (
            <div className="space-y-4">
              <ul className="space-y-1 text-sm">
                {req.checks.map((c) => <li key={c.label} className={c.ok ? "text-emerald-700" : "text-amber-700"}>{c.ok ? "✓" : "✗"} {c.label}</li>)}
              </ul>
              <div className="rounded-xl bg-ln-50 p-4 text-sm">
                <div className="font-serif text-lg text-ln-900">Attestato di partecipazione</div>
                <div>{req.enrollment.student.firstName} {req.enrollment.student.lastName}</div>
                <div>“{req.enrollment.edition.courseType.title}”</div>
                <div className="text-stone-600">Periodo: {fmtDate(req.periodFrom)} – {fmtDate(req.periodTo)} · {req.hours.toLocaleString("it-IT")} ore frequentate</div>
              </div>
              <ActionForm action={issueCertificate.bind(null, req.enrollment.id)} className="space-y-3">
                {!req.ok && (
                  <Field label="Motivazione per emettere senza requisiti (override tracciato)">
                    <textarea className="input" name="overrideReason" />
                  </Field>
                )}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" /> Confermo che i dati sono corretti</label>
                <Button>Emetti attestato</Button>
              </ActionForm>
            </div>
          ) : <Empty>Seleziona un percorso a sinistra.</Empty>}
        </Card>
      </div>

      <h2 className="mb-3 font-serif text-xl text-ln-900">Attestati emessi</h2>
      {certificates.length ? (
        <Table head={["Numero", "Allieva", "Corso", "Emesso", "Stato", ""]}>
          {certificates.map((c) => (
            <tr key={c.id}>
              <Td className="font-mono text-xs">{c.number}</Td>
              <Td>{c.studentName}</Td>
              <Td>{c.courseTitle}</Td>
              <Td>{fmtDate(c.issuedAt)}{c.overrideReason && <div className="text-xs text-amber-700">override: {c.overrideReason}</div>}</Td>
              <Td>{c.revokedAt ? <><Badge tone="red">Annullato</Badge><div className="text-xs text-stone-500">{c.revokeReason}</div></> : <Badge tone="green">Valido</Badge>}</Td>
              <Td>
                <a className="text-ln-700 underline" href={`/api/attestati/${c.id}`} target="_blank">PDF</a>
                {!c.revokedAt && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-red-700">Annulla</summary>
                    <form action={revokeCertificate.bind(null, c.id)} className="mt-1 flex gap-1">
                      <input className="input text-xs" name="reason" placeholder="Motivo" required />
                      <Button variant="danger">OK</Button>
                    </form>
                  </details>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      ) : <Empty>Nessun attestato emesso.</Empty>}
    </>
  );
}
