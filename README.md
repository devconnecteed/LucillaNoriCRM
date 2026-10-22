# LN Stile e Portamento · Piattaforma corsi

MVP (P0) della piattaforma descritta in `../Flusso_Piattaforma_LN_Portamento.pdf` (spec v1.0, 22/10/2026).

**Stack:** Next.js 15 (App Router, server actions) · TypeScript · Prisma · SQLite in sviluppo (Postgres in produzione) · Tailwind 4 · pdf-lib.

## Avvio

```bash
npm install
cp .env.example .env          # imposta SESSION_SECRET (≥ 32 caratteri casuali)
npx prisma migrate dev        # crea il DB ed esegue il seed
npm run dev                   # http://localhost:3000
```

Utenti di prova (password `LnDemo2026!`, cambiabile con `SEED_PASSWORD`): `admin@ln.local`, `docente@ln.local`, `allieva.demo@ln.local`.

| Comando | |
|---|---|
| `npm test` | test unitari (punteggi, libreria modelli, protezione chiavi del quiz, confronti prima/dopo) |
| `npm run typecheck` / `npm run lint` | controlli statici |
| `npm run db:reset` | ricrea il DB locale da zero con il seed |

In sviluppo le email (inviti, notifiche) vengono salvate nella tabella `Notification` e stampate in console; il link d'invito compare anche nella pagina dell'allieva.

## Copertura della specifica

| § | Ambito | Stato |
|---|---|---|
| 1–2 | Flusso end-to-end, ruoli Admin / Docente / Allieva | ✅ autorizzazioni server-side per record (`src/lib/guards.ts`) |
| 3 | Anagrafiche: ricerca, filtri, duplicati email/telefono, campi Sposa, dati fisici riservati, minori + tutore, consensi, note docente | ✅ |
| 4 | Tipologie corso configurabili, edizioni, lezioni, iscrizioni, presenze | ✅ |
| 5 | Builder: 8 tipi di campo, sezioni, ordine, obbligatorietà, punteggi, anteprima mobile, versioni immutabili, duplicazione | ✅ (sezioni condizionali: non ancora) |
| 6 | Libreria iniziale dai 7 allegati unici (`prisma/library.ts`), **solo struttura, senza i dati compilati** | ✅ |
| 7 | Area allieva mobile: form a sezioni, progress bar, bozza, riepilogo, invio, dashboard | ✅ |
| 8 | Punteggio automatico, revisione tracciata, pubblicazione separata, confronto prima/dopo per domande equivalenti | ✅ (report PDF: P1) |
| 9 | Attestato PDF con verifica requisiti, override motivato, annullamento | ✅ (QR di verifica: P2) |
| 10 | Dashboard e navigazione docente | ✅ |
| 12 | Inviti scaduti/rinnovo, proroga, sollecito, riapertura, cambio email, revoca accesso | ✅ |
| 13 | Audit log, cookie di sessione firmati, password hashate, token d'invito salvati solo come hash | ✅ base |

### Scelte da validare (spec §16)

Ho applicato questi default, tutti modificabili:
- **Corsi:** individuali e di gruppo, entrambi supportati.
- **Accesso:** invito via email con link monouso valido 7 giorni e password scelta dall'allieva. OTP e WhatsApp non sono inclusi.
- **Frequenza minima per l'attestato:** 80% di default, impostabile per edizione. L'override della docente è motivato e tracciato.
- **Risultati:** non sono mai visibili all'allieva finché la docente non li pubblica, quiz compresi.
- **Domande senza risposta nei quiz:** valgono 0 punti.

### Concetti chiave
- **Modello → Versione → Assegnazione → Risposta.** Una versione pubblicata non si modifica mai: per cambiare un modello si crea una nuova bozza e la si pubblica. Le compilazioni restano sempre legate alla loro versione.
- **Confronti nel tempo.** Le domande a scala con la stessa chiave `dimension` vengono confrontate tra loro, per esempio `sposa_tacchi` nel test di arrivo e in quello di fine incontro. Le rubriche della docente stanno in righe separate dall'autovalutazione dell'allieva.
- **Quiz.** Le risposte corrette vengono tolte dal contenuto prima di inviarlo al browser dell'allieva (`stripAnswerKey`).

## Prima della produzione
- Passare a Postgres: cambiare il `provider` in `prisma/schema.prisma` e il valore di `DATABASE_URL`.
- Collegare un provider email con retry (`src/lib/notify.ts`).
- Aggiungere un rate limit al login e un flusso "password dimenticata". Oggi la docente rimanda un invito, che funziona da reset.
- Definire backup, conservazione dei dati e base giuridica per i dati fisici insieme al DPO (§13).
- Branding definitivo, firma e testo dell'attestato (§16).
