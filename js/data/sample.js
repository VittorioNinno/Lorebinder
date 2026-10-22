/** Documento di esempio con contenuti INVENTATI, solo per mostrare i blocchi disponibili. */
export const SAMPLE = {
  title: 'Le Cronache di Brumafonda',
  subtitle: 'Guida del Master — testo di esempio',
  toc: true,
  sections: [
    {
      title: 'Capitolo I — Il Porto delle Lanterne',
      blocks: [
        {
          type: 'luogo', open: false,
          data: {
            titolo: 'Il Molo delle Lanterne Spente',
            lettura: 'Una foschia color latte risale dal mare e inghiotte le prime luci del mattino. Lungo il molo di legno nero, decine di lanterne di quarzo pendono da pali storti, tutte spente da quando il faro ha smesso di brillare. Odore di alghe, olio di balena e pane bruciato; da qualche parte una campana batte tre colpi lenti.',
            orari: 'Sempre aperto; traffico intenso all’alba',
            permessi: 'Ormeggio: 5 ma a notte',
            sorv: 'Due guardie del porto armate di arpioni, ronda ogni ora',
            vie: '- **Via dei Cordai:** stradina lastricata che sale verso il mercato.\n- **Scala dei Pescatori:** gradini viscidi che scendono alle barche.',
            aree: '- **Il Faro Spento:** torre di pietra bianca sul capo orientale, chiusa da una porta di ferro.\n- **La Taverna del Granchio Zoppo:** locanda a due piani, ritrovo dei marinai.',
          },
        },
        {
          type: 'png', open: false,
          data: {
            nome: 'Ilda Fenrow', razza: 'Nana', ruolo: 'Capobanchina',
            aspetto: 'Cinquantenne alta 130 cm per 70 kg, spalle larghe e trecce rosso rame fermate da anelli di ottone. Indossa un lungo cappotto cerato e guanti da scaricatore.',
            segni: 'Odore di catrame e sale. Batte due volte il bastone a terra prima di parlare; voce roca e decisa.',
            psi: 'Pragmatica e testarda. Ha a cuore i pescatori più dei commercianti; si addolcisce con chi porta rispetto e pesce fresco.',
            arg: 'Maree, tariffe di ormeggio, la vecchia gloria del faro.',
            segr: 'Affitta ormeggi (**5 ma** a notte). Se ben trattata, rivela che il faro si è spento la notte in cui è sparito il custode, *Orlo Vanti*.',
          },
        },
        {
          type: 'oggetto', open: false,
          data: {
            nome: 'Lanterna di Quarzo Fioco', sub: 'Oggetto magico, richiede sintonia',
            natura: 'Lanterna di ottone con un cristallo di quarzo opaco al posto della fiamma.',
            prop: 'Emette luce fioca per 6 metri. Diventa blu se un non morto si trova entro 9 metri.',
            coll: 'Appesa nell’ufficio di Ilda Fenrow; la cede in cambio di un favore.',
          },
        },
        {
          type: 'fazione', open: false,
          data: {
            nome: 'La Gilda dei Fanalisti', sub: 'Custodi delle luci del porto',
            emb: 'Una fiamma stilizzata dentro un cerchio d’ottone.',
            ruolo: 'Mantengono le lanterne e il faro; ora in difficoltà per la scomparsa del custode.',
            segni: 'Spille d’ottone sul bavero e gergo fatto di segnali luminosi.',
            rapp: 'Alleati dei pescatori, diffidenti verso la Guardia del Porto.',
          },
        },
        {
          type: 'mostro', open: false,
          data: {
            nome: 'Granchio d’Ombra', tipo: 'Mostruosità Media, senza allineamento',
            ca: '14 (armatura naturale)', pf: '27 (5d8 + 5)', vel: '6 m, nuotare 9 m',
            car: '14,12,13,2,10,4', abil: 'Furtività +3',
            sensi: 'Scurovisione 18 m, Percezione passiva 10', ling: '—', sfida: '1 (200 PE)',
            tratti: '**Anfibio.** Respira aria e acqua.\n**Mimetismo d’Ombra.** Vantaggio a Furtività in luce fioca o buio.',
            azioni: '**Chela.** *Attacco con arma da mischia:* +4 al tiro per colpire, portata 1,5 m, un bersaglio. *Colpito:* 7 (1d8 + 3) danni contundenti; il bersaglio è afferrato (CD 12).',
          },
        },
        {
          type: 'tabella', open: false,
          data: {
            titolo: 'Listino della Taverna del Granchio Zoppo',
            righe: 'Voce | Prezzo | Note\nZuppa di molluschi | 3 mr | Con pane\nBirra scura | 4 mr | Boccale\nStanza condivisa | 2 ma | Per notte\nStanza privata | 8 ma | Con serratura',
          },
        },
      ],
    },
    {
      title: 'Capitolo II — Diario di Campagna',
      blocks: [
        {
          type: 'sessione', open: false,
          data: {
            num: '1', titolo: 'Il faro che non brilla', data: '12/03/2026',
            riassunto: 'Il gruppo arriva a Brumafonda e accetta l’incarico di Ilda Fenrow: scoprire perché il faro è spento.',
            eventi: '- Scontro con due granchi d’ombra sotto il molo.\n- Trovata la chiave del faro nella tasca di un pescatore.',
            png: 'Ilda Fenrow, Tobbo il cordaio',
            bottino: '35 ma, una *Lanterna di Quarzo Fioco*.',
            ganci: 'Chi ha dato la chiave al pescatore? Il faro è davvero vuoto?',
          },
        },
        {
          type: 'nota', open: false,
          data: { titolo: 'Idee per il Master', testo: 'Il custode **Orlo Vanti** è prigioniero in una grotta sotto il faro. Preparare un incontro con i granchi e una prova di nuoto.' },
        },
      ],
    },
  ],
};
