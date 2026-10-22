// Libreria iniziale ricavata dagli allegati del 22/10/2026 (spec §6).
// Importata SOLO la struttura: nessuna risposta compilata o dato personale presente nei documenti originali.
// I campi "Nome / Data / Lezione n°" dei moduli cartacei sono omessi: la piattaforma li conosce già.
import type { Item, Option, QuestionnaireContent } from "../src/lib/questionnaire/types";

const opts = (...labels: string[]): Option[] => labels.map((label, i) => ({ id: `o${i + 1}`, label }));

const scale = (id: string, label: string, dimension?: string, minLabel = "per niente vero", maxLabel = "del tutto vero"): Item => ({
  id, type: "scale", label, min: 1, max: 5, minLabel, maxLabel, required: true, ...(dimension ? { dimension } : {}),
});
const text = (id: string, label: string, long = true, required = false): Item => ({ id, type: "text", label, long, required });
const single = (id: string, label: string, options: Option[], extra: Partial<Item> = {}): Item =>
  ({ id, type: "single", label, options, required: true, ...extra }) as Item;

export type LibraryTemplate = {
  key: string;
  title: string;
  description: string;
  course: "stile" | "concorso" | "sposa";
  phase: string;
  audience: "STUDENT" | "TEACHER";
  sourceFile: string;
  /** Più versioni = storico; l'ultima è quella pubblicata. */
  versions: QuestionnaireContent[];
};

// ---------------------------------------------------------------- Stile e Portamento

const autovalutazioneIniziale: QuestionnaireContent = {
  intro:
    "Questo piccolo test richiede due minuti e serve a capire da dove partiamo, così da costruire un percorso davvero su misura. Non ci sono risposte giuste o sbagliate: rispondi di getto, con sincerità.",
  outro: "Invia il test e ti manderò la mia lettura insieme alla proposta del tuo percorso.",
  sections: [
    {
      id: "s1",
      title: "Parte 1 · Come ti senti oggi",
      description: "1 = per niente vero, 5 = del tutto vero. Quanto ti riconosci in questa frase?",
      items: [
        scale("q1", "Mi sento a mio agio quando cammino e so di essere osservata.", "agio_osservata"),
        scale("q2", "So dove tenere le braccia e le mani quando sono in piedi davanti ad altri.", "braccia_mani"),
        scale("q3", "Mantengo le spalle aperte e rilassate senza doverci pensare.", "spalle_aperte"),
        scale("q4", "Cammino con i tacchi in modo sicuro e naturale.", "tacchi_sicuro"),
        scale("q5", "Il mio sguardo resta alto e fermo quando parlo o mi presento.", "sguardo_alto"),
        scale("q6", "A fine giornata non ho tensioni a collo, spalle o schiena.", "no_tensioni_fine_giornata"),
      ],
    },
    {
      id: "s2",
      title: "Parte 2 · Raccontami di te",
      items: [
        text("q7", "In quale situazione vorresti sentirti più sicura? (lavoro, eventi, foto, vita quotidiana…)"),
        text("q8", "C’è qualcosa del tuo modo di muoverti che non ti piace o che ti hanno fatto notare?"),
        {
          ...text("q9", "Hai avuto problemi fisici rilevanti (schiena, ginocchia, caviglie) o pratichi già sport o danza?"),
          help: "Facoltativo. Queste informazioni sono visibili solo alla tua insegnante.",
        },
        text("q10", "Quanti giorni a settimana puoi dedicare a 10 minuti di esercizi a casa?", false),
      ],
    },
  ],
};

const facilita = opts("Facile", "Così così", "Difficile");
const sensazione = opts("Sì", "Un po’", "No");

const fineLezioneLN: QuestionnaireContent = {
  intro:
    "Due minuti per vedere quanta strada abbiamo fatto insieme. Non ci sono risposte giuste o sbagliate: rispondi di getto e con sincerità.",
  outro: "Invia il test: ti manderò la mia lettura dei tuoi progressi e gli esercizi su cui concentrarti fino al prossimo incontro.",
  sections: [
    {
      id: "s1",
      title: "Parte 1 · Come ti senti adesso",
      description: "1 = per niente vero, 5 = del tutto vero. Quanto ti riconosci in questa frase?",
      items: [
        scale("q1", "Mi sento a mio agio quando cammino e so di essere osservata.", "agio_osservata"),
        scale("q2", "So dove tenere le braccia e le mani quando sono in piedi davanti ad altri.", "braccia_mani"),
        scale("q3", "Mantengo le spalle aperte e rilassate senza doverci pensare.", "spalle_aperte"),
        scale("q4", "Cammino con i tacchi in modo sicuro e naturale.", "tacchi_sicuro"),
        scale("q5", "Il mio sguardo resta alto e fermo quando parlo o mi presento.", "sguardo_alto"),
        scale("q6", "Sento il corpo più leggero e meno contratto rispetto all’inizio.", "corpo_leggero"),
        scale("q7", "Mi sento più sicura di me rispetto a prima della lezione.", "sicura_vs_inizio_lezione"),
      ],
    },
    {
      id: "s2",
      title: "Parte 2 · Gli esercizi di oggi",
      description: "Come ti sei trovata con ciascun esercizio?",
      items: [
        single("q8", "Camminata e passo", facilita),
        single("q9", "Postura in piedi e allineamento", facilita),
        single("q10", "Posizione di braccia e mani", facilita),
        single("q11", "Camminata con i tacchi", facilita),
        single("q12", "Sguardo e modo di presentarsi", facilita),
        single("q13", "Esercizi di respirazione e rilassamento", facilita),
      ],
    },
    {
      id: "s3",
      title: "Parte 3 · Il tuo corpo dopo la lezione",
      description: "Durante o dopo gli esercizi hai sentito… (facoltativo, visibile solo alla tua insegnante)",
      items: [
        single("q14", "Tensione a collo o spalle", sensazione, { required: false }),
        single("q15", "Fastidio alla schiena", sensazione, { required: false }),
        single("q16", "Fastidio a ginocchia o caviglie", sensazione, { required: false }),
        single("q17", "Stanchezza ai piedi con i tacchi", sensazione, { required: false }),
      ],
    },
    {
      id: "s4",
      title: "Parte 4 · Da qui in avanti",
      items: [
        single("q18", "Quanti giorni a settimana farai i 10 minuti di esercizi a casa?", opts("1", "2–3", "4–5", "Ogni giorno")),
        single("q19", "Dove metterai in pratica per prima cosa ciò che hai imparato?", opts("Lavoro", "Eventi", "Foto", "Vita quotidiana")),
      ],
    },
    {
      id: "s5",
      title: "Parte 5 · La tua opinione sulla lezione",
      description: "1 = per niente, 5 = moltissimo. Quanto sei d’accordo?",
      items: [
        scale("q20", "Le spiegazioni erano chiare e facili da seguire.", "lezione_chiarezza", "per niente", "moltissimo"),
        scale("q21", "Il ritmo della lezione era giusto per me.", "lezione_ritmo", "per niente", "moltissimo"),
        scale("q22", "Mi sono sentita a mio agio e seguita.", "lezione_agio", "per niente", "moltissimo"),
      ],
    },
    {
      id: "s6",
      title: "Una domanda per te",
      items: [
        text("q23", "Qual è la cosa più importante che porti a casa da oggi, e cosa vorresti approfondire la prossima volta?"),
      ],
    },
  ],
};

const quizPosturaGiri: QuestionnaireContent = {
  intro: "Postura · Mezzo giro · Giro completo · Piccole coreografie. C’è una sola risposta giusta per ogni domanda.",
  sections: [
    {
      id: "s1",
      title: "Quiz di fine lezione",
      items: [
        single("q1", "Qual è la postura corretta per un buon portamento?", opts(
          "Spalle alzate e schiena inarcata",
          "Spalle basse e rilassate, schiena dritta, addome attivo e mento parallelo al pavimento",
          "Busto leggermente in avanti e sguardo verso i piedi",
          "Ginocchia bloccate e braccia rigide lungo i fianchi",
        ), { correct: "o2", points: 1 }),
        single("q2", "Di quanti gradi ruota il corpo in un mezzo giro?", opts("90 gradi", "180 gradi", "270 gradi", "360 gradi"), { correct: "o2", points: 1 }),
        single("q3", "Che cos’è lo “spotting” (fissare un punto) durante un giro completo?", opts(
          "Chiudere gli occhi per concentrarsi",
          "Guardare sempre i propri piedi",
          "Fissare un punto davanti a sé, lasciarlo per ultimo con la testa e ritrovarlo per primo",
          "Girare la testa nella direzione opposta al giro",
        ), { correct: "o3", points: 1 }),
        single("q4", "Dove deve stare il peso del corpo per girare con equilibrio?", opts(
          "Sui talloni",
          "Sulla parte anteriore del piede (avampiede), con il corpo compatto",
          "Diviso a metà tra i due piedi molto aperti",
          "Sul bordo esterno del piede",
        ), { correct: "o2", points: 1 }),
        single("q5", "Qual è il modo migliore per imparare una piccola coreografia?", opts(
          "Provarla subito tutta alla massima velocità",
          "Memorizzare solo la musica senza i passi",
          "Dividerla in blocchi, contare i tempi (es. su 8), provarla lenta e poi unire le parti",
          "Guardare il video una volta sola",
        ), { correct: "o3", points: 1 }),
      ],
    },
  ],
};

const eserciziPosturaGiri: QuestionnaireContent = {
  intro: "Bastano 10 minuti al giorno. Salva il diario ogni giorno e invialo a fine settimana.",
  sections: [
    {
      id: "s1",
      title: "Esercizi da fare a casa",
      items: [
        { id: "e1", type: "info", label: "1. Postura allo specchio", help: "In piedi per un minuto con spalle basse, addome attivo e mento parallelo al pavimento. Poi cammina per la stanza mantenendo la stessa postura, come su una passerella." },
        { id: "e2", type: "info", label: "2. Spotting da fermi", help: "Scegli un punto sul muro e gira solo la testa velocemente a destra e a sinistra, tornando sempre al punto." },
        { id: "e3", type: "info", label: "3. Mezzi giri e giri completi", help: "5 mezzi giri per lato, poi 5 giri completi per lato, lentamente e fissando il punto. Meglio puliti che veloci." },
        { id: "e4", type: "info", label: "4. Ripasso della coreografia", help: "Una a tua scelta, con stop e giri (se vuoi fai un video)." },
      ],
    },
    {
      id: "s2",
      title: "Il mio diario di allenamento",
      items: [
        {
          id: "d1",
          type: "diary",
          label: "Spunta i giorni in cui hai fatto ogni esercizio",
          rows: opts("Postura allo specchio", "Spotting da fermi", "Mezzi giri e giri completi", "Ripasso della coreografia"),
          days: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
        },
        text("d2", "Note per la tua insegnante (facoltativo)"),
      ],
    },
  ],
};

// ---------------------------------------------------------------- Moda / Concorso

const concorsoFineLezione: QuestionnaireContent = {
  intro: "Da compilare alla fine della lezione.",
  sections: [
    {
      id: "s1",
      title: "Cosa abbiamo fatto oggi",
      items: [
        {
          id: "q1", type: "multiple", label: "Spunta tutto ciò che hai praticato:", required: true,
          options: opts("Camminata", "Stop", "Giri (180° / 360°)", "Pose", "Ingresso e saluto", "Abito da sera", "Intervista", "Esercizi"),
        },
      ],
    },
    {
      id: "s2",
      title: "Come me la sono cavata",
      description: "1 = da migliorare · 3 = bene · 5 = benissimo",
      items: [
        scale("q2", "Postura e portamento", "conc_postura", "da migliorare", "benissimo"),
        scale("q3", "Camminata", "conc_camminata", "da migliorare", "benissimo"),
        scale("q4", "Giri ed equilibrio", "conc_giri", "da migliorare", "benissimo"),
        scale("q5", "Pose", "conc_pose", "da migliorare", "benissimo"),
        scale("q6", "Presenza ed espressione", "conc_presenza", "da migliorare", "benissimo"),
        scale("q7", "Intervista / come parlo", "conc_intervista", "da migliorare", "benissimo"),
      ],
    },
    {
      id: "s3",
      title: "Le mie note",
      items: [
        text("q8", "Cosa mi è riuscito meglio oggi:"),
        text("q9", "Cosa ho trovato più difficile:"),
        text("q10", "Su cosa voglio lavorare la prossima volta:"),
      ],
    },
    {
      id: "s4",
      title: "Come mi sono sentita oggi",
      items: [
        scale("q11", "Come mi sono sentita oggi", "conc_stato_emotivo", "male", "benissimo"),
        text("q12", "Una cosa che ho imparato e che voglio ricordare:"),
      ],
    },
  ],
};

// ---------------------------------------------------------------- Portamento Sposa

const sposaCriteria = opts(
  "Postura generale",
  "Camminata e passo",
  "Equilibrio sui tacchi",
  "Gestione dello strascico",
  "Gestione del bouquet",
  "Gestione del velo",
  "Braccia, mani e spalle",
  "Sguardo ed espressione",
  "Gestione dell’emozione",
  "Posa per le foto",
).map((o, i) => ({ ...o, id: ["postura", "camminata", "equilibrio", "strascico", "bouquet", "velo", "braccia", "sguardo", "emozione", "foto"][i] }));

const sposaValutazione: QuestionnaireContent = {
  intro: "Corso Sposa – riepilogo della lezione. Compilata dall’insegnante; la sezione “La parola alla sposa” si raccoglie a voce a fine lezione.",
  sections: [
    {
      id: "s1",
      title: "Valutazione delle competenze",
      items: [
        {
          id: "r1", type: "rubric", label: "Competenze osservate", required: true,
          criteria: sposaCriteria, min: 1, max: 5, minLabel: "da migliorare", maxLabel: "ottimo", dimensionPrefix: "sposa_rubrica",
        },
      ],
    },
    {
      id: "s2",
      title: "I progressi di oggi",
      items: [
        text("t1", "Punti di forza:"),
        text("t2", "Su cosa lavoriamo la prossima volta:"),
        text("t3", "Esercizi assegnati per casa:"),
      ],
    },
    {
      id: "s3",
      title: "La parola alla sposa",
      items: [
        scale("f1", "Quanto ti senti più sicura rispetto all’inizio della lezione?", "sposa_sicura_vs_inizio", "poco", "moltissimo"),
        text("f2", "Cosa ti è piaciuto di più / cosa vorresti rivedere:"),
      ],
    },
    {
      id: "s4",
      title: "Prossimo appuntamento",
      items: [{ id: "n1", type: "date", label: "Data del prossimo appuntamento" }],
    },
  ],
};

const sposaDomandeAperte = [
  text("a1", "Hai già indossato l'abito con le scarpe scelte? Per quanto tempo?"),
  text("a2", "C'è un momento della giornata che ti preoccupa in particolare (ingresso, scale, giri di ballo, foto...)?"),
  { ...text("a3", "Hai dolori, fastidi fisici o difficoltà di equilibrio di cui dovrei essere a conoscenza?"), help: "Facoltativo. Visibile solo alla tua insegnante." },
  text("a4", "Come vorresti sentirti mentre cammini verso l'altare (in tre parole)?", false),
];

// v1: "Test_Portamento_Sposa arrivo e fine" — PRIMA
const sposaPrimaV1: QuestionnaireContent = {
  intro: "Da compilare all'arrivo, prima di iniziare.",
  sections: [
    {
      id: "s0", title: "Il matrimonio",
      items: [
        { id: "m1", type: "date", label: "Data del matrimonio" },
        text("m2", "Luogo della cerimonia (chiesa / comune / location)", false),
      ],
    },
    {
      id: "s1", title: "1. Il tuo rapporto con il portamento", description: "1 = per niente · 5 = moltissimo",
      items: [
        scale("p1", "Quanto ti senti sicura camminando con i tacchi?", "sposa_tacchi", "per niente", "moltissimo"),
        scale("p2", "Quanto ti senti a tuo agio con il tuo corpo in questo momento?", "sposa_agio_corpo", "per niente", "moltissimo"),
        scale("p3", "Quanto ti senti in ansia pensando al momento dell'ingresso?", "sposa_ansia_ingresso", "per niente", "moltissimo"),
      ],
    },
    { id: "s2", title: "2. Domande aperte", items: sposaDomandeAperte },
    { id: "s3", title: "3. Obiettivo di oggi", items: [text("o1", "Cosa vorresti portarti a casa da questo incontro?")] },
  ],
};

// v2: "Test_Portamento_Sposa UFF" — scheda conoscitiva + PRIMA
const sposaPrimaV2: QuestionnaireContent = {
  intro: "Da compilare all'arrivo, prima di iniziare.",
  sections: [
    {
      id: "s0", title: "Scheda conoscitiva",
      items: [text("k1", "Come ci hai conosciuto?", false)],
    },
    {
      id: "s0b", title: "Il matrimonio",
      items: [
        { id: "m1", type: "date", label: "Data delle nozze" },
        text("m2", "Città / location", false),
        text("m3", "Canzone d'ingresso", false),
        single("m4", "Tipo di cerimonia", opts("Chiesa", "Civile", "All'aperto / giardino", "Spiaggia", "Altro"), { required: false }),
      ],
    },
    {
      id: "s0c", title: "L'abito e gli accessori",
      items: [
        text("m5", "Stile dell'abito (principessa, sirena, impero, a colonna...)", false),
        text("m6", "Lunghezza dello strascico (corto / medio / lungo, cm se noto)", false),
        text("m7", "Velo (sì / no, lunghezza, sopra il viso?)", false),
        text("m8", "Tacco (altezza, tipo, già abituata?)", false),
        text("m9", "Bouquet (forma, peso, dimensioni)", false),
      ],
    },
    {
      id: "s1", title: "1. Il tuo rapporto con il portamento", description: "1 = per niente · 5 = moltissimo",
      items: [
        scale("p1", "Quanto ti senti sicura camminando con i tacchi?", "sposa_tacchi", "per niente", "moltissimo"),
        scale("p3", "Quanto ti senti in ansia pensando al momento dell'ingresso?", "sposa_ansia_ingresso", "per niente", "moltissimo"),
      ],
    },
    { id: "s2", title: "2. Domande aperte", items: sposaDomandeAperte },
  ],
};

const sposaDopoAperte = [
  text("a1", "Cosa è cambiato rispetto a come ti sentivi all'inizio dell'incontro?"),
  text("a2", "Qual è stato l'esercizio o il momento più utile per te?"),
  text("a3", "C'è ancora qualcosa che ti preoccupa o su cui vorresti lavorare?"),
];

const sposaDopoV1: QuestionnaireContent = {
  intro: "Da compilare al termine dell'incontro.",
  sections: [
    {
      id: "s1", title: "1. Autovalutazione", description: "1 = per niente · 5 = moltissimo",
      items: [
        scale("p1", "Quanto ti senti sicura camminando con i tacchi, adesso?", "sposa_tacchi", "per niente", "moltissimo"),
        scale("p2", "Quanto ti senti a tuo agio con il tuo corpo, adesso?", "sposa_agio_corpo", "per niente", "moltissimo"),
        scale("p4", "Quanto ti senti pronta per il giorno del matrimonio?", "sposa_pronta", "per niente", "moltissimo"),
      ],
    },
    { id: "s2", title: "2. Domande aperte", items: sposaDopoAperte },
    {
      id: "s3", title: "3. Feedback sull'incontro",
      items: [scale("f1", "Quanto ti è piaciuto questo incontro?", "sposa_gradimento", "per niente", "moltissimo"), text("f2", "Note:")],
    },
  ],
};

const sposaDopoV2: QuestionnaireContent = {
  ...sposaDopoV1,
  sections: [
    {
      id: "s1", title: "1. Autovalutazione", description: "1 = per niente · 5 = moltissimo",
      items: [
        scale("p1", "Quanto ti senti sicura camminando con i tacchi, adesso?", "sposa_tacchi", "per niente", "moltissimo"),
        scale("p4", "Quanto ti senti pronta per il giorno del matrimonio?", "sposa_pronta", "per niente", "moltissimo"),
      ],
    },
    ...sposaDopoV1.sections.slice(1),
  ],
};

export const LIBRARY: LibraryTemplate[] = [
  {
    key: "ln-autovalutazione", title: "Test di autovalutazione iniziale",
    description: "Portamento, postura e presenza: da dove partiamo.", course: "stile", phase: "INITIAL", audience: "STUDENT",
    sourceFile: "Test LN STILE E PORTAMENTO .pdf", versions: [autovalutazioneIniziale],
  },
  {
    key: "ln-fine-lezione", title: "Test di fine lezione",
    description: "23 elementi: come ti senti, esercizi, sensazioni corporee, opinione sulla lezione.", course: "stile", phase: "LESSON", audience: "STUDENT",
    sourceFile: "Test_fine_lezione_LN.pdf", versions: [fineLezioneLN],
  },
  {
    key: "quiz-postura-giri", title: "Quiz · Postura, giri e coreografie",
    description: "5 domande a risposta singola con correzione automatica.", course: "stile", phase: "LESSON", audience: "STUDENT",
    sourceFile: "quiz + esercizi GIULIA .pdf (pag. 1)", versions: [quizPosturaGiri],
  },
  {
    key: "esercizi-postura-giri", title: "Esercizi a casa + diario settimanale",
    description: "4 esercizi da 10 minuti e diario a spunte Lun–Dom.", course: "stile", phase: "EXERCISES", audience: "STUDENT",
    sourceFile: "quiz + esercizi GIULIA .pdf (pag. 2)", versions: [eserciziPosturaGiri],
  },
  {
    key: "concorso-fine-lezione", title: "Scheda di fine lezione · Corso Moda/Concorso",
    description: "Checklist attività, autovalutazione su 6 competenze, note e stato emotivo.", course: "concorso", phase: "LESSON", audience: "STUDENT",
    sourceFile: "Scheda_Fine_Lezione concorso.docx", versions: [concorsoFineLezione],
  },
  {
    key: "sposa-valutazione", title: "Scheda di valutazione Sposa (docente)",
    description: "Rubrica su 10 competenze, punti di forza, compiti e feedback della sposa.", course: "sposa", phase: "LESSON", audience: "TEACHER",
    sourceFile: "scheda valutazione sposa .docx", versions: [sposaValutazione],
  },
  {
    key: "sposa-prima", title: "Test Sposa · All'arrivo",
    description: "v1 dal modulo “arrivo e fine”; v2 (in uso) dalla versione UFF con scheda conoscitiva.", course: "sposa", phase: "PROFILE", audience: "STUDENT",
    sourceFile: "Test_Portamento_Sposa arrivo e fine .docx → Test_Portamento_Sposa UFF.docx", versions: [sposaPrimaV1, sposaPrimaV2],
  },
  {
    key: "sposa-dopo", title: "Test Sposa · Fine incontro",
    description: "v1 dal modulo “arrivo e fine”; v2 (in uso) dalla versione UFF.", course: "sposa", phase: "FINAL", audience: "STUDENT",
    sourceFile: "Test_Portamento_Sposa arrivo e fine .docx → Test_Portamento_Sposa UFF.docx", versions: [sposaDopoV1, sposaDopoV2],
  },
];
