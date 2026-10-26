// Crea un utente reale (amministratrice o docente) e stampa il link d'invito per scegliere la password.
// Da usare per la messa in produzione al posto del seed demo:
//   npx tsx scripts/crea-utente.ts --email lucilla@esempio.it --nome "Lucilla Nori" --ruolo ADMIN
// Ruoli: ADMIN | TEACHER. Se l'utente esiste già, genera solo un nuovo invito (utile come reset password).
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const db = new PrismaClient();
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("nome")?.trim();
  const role = (arg("ruolo") ?? "TEACHER").toUpperCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Indica un'email valida con --email");
  if (!["ADMIN", "TEACHER"].includes(role)) throw new Error("--ruolo deve essere ADMIN o TEACHER");

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    if (!name) throw new Error("Per un nuovo utente indica anche --nome");
    user = await db.user.create({ data: { email, name, role } });
    console.log(`Creato ${role === "ADMIN" ? "amministratrice" : "docente"}: ${name} <${email}>`);
  } else {
    if (user.role === "STUDENT") throw new Error("Questa email appartiene a un'allieva: usare l'invito dall'app.");
    await db.user.update({ where: { id: user.id }, data: { active: true } });
    console.log(`Utente esistente: genero un nuovo invito per ${user.name} <${email}>`);
  }

  // Stessa logica di createInvite (src/lib/auth.ts): token monouso, nel DB solo l'hash, validità 7 giorni
  const token = randomBytes(32).toString("base64url");
  await db.invite.updateMany({ where: { userId: user.id, usedAt: null }, data: { expiresAt: new Date() } });
  await db.invite.create({
    data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 7 * 86400_000) },
  });
  console.log(`\nLink d'invito (valido 7 giorni, monouso):\n${process.env.APP_URL ?? "http://localhost:3000"}/invito/${token}\n`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
