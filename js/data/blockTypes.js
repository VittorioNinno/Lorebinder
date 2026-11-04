/**
 * Definizione dei tipi di blocco.
 * Per aggiungerne uno nuovo: 1) descrivilo qui, 2) aggiungi il renderer in render/renderers.js.
 * kind: 'text' | 'textarea' | 'image'
 */
const t = (key, label) => ({ key, label, kind: 'text' });
const a = (key, label) => ({ key, label, kind: 'textarea' });
const i = (key, label) => ({ key, label, kind: 'image' });

export const BLOCK_TYPES = {
  luogo: {
    label: 'Luogo',
    fields: [
      t('titolo', 'Titolo del luogo'), i('img', 'Immagine ambientale (16:9)'),
      a('lettura', 'Testo da leggere ad alta voce'),
      t('orari', 'Orari'), t('permessi', 'Permessi'), t('sorv', 'Sorveglianza & Rischi'),
      t('pericoli', 'Pericoli Ambientali (facoltativo)'),
      a('vie', 'Vie d’accesso (una per riga)'),
      a('aree', 'Aree & Settori in elenco semplice (una per riga; in alternativa usa i blocchi Area)'),
    ],
  },
  area: {
    label: 'Area / Settore',
    fields: [
      t('settore', 'Settore (facoltativo: apre un nuovo raggruppamento, es. SETTORE I: IL QUARTIERE SOLARE)'),
      t('titolo', 'Nome dell’area'), a('descr', 'Descrizione ambientale'),
    ],
  },
  png: {
    label: 'PNG',
    fields: [
      t('nome', 'Nome'), t('razza', 'Razza'), t('ruolo', 'Ruolo'), i('img', 'Ritratto'),
      a('aspetto', 'Aspetto Fisico & Vestiario'), a('segni', 'Segni Particolari, Prossemica & Voce'),
      a('psi', 'Psicologia & Reazioni al Tavolo'), a('arg', 'Argomenti Preferiti'),
      a('segr', 'Segreti, Tariffe & Nozioni Rivelabili'),
    ],
  },
  oggetto: {
    label: 'Oggetto',
    fields: [
      t('nome', 'Nome'), t('sub', 'Sottotitolo'), i('img', 'Immagine'),
      a('natura', 'Natura & Manifattura'), a('prop', 'Proprietà & Meccanica d’Uso'),
      a('coll', 'Collocazione & Come Ottenerlo'),
    ],
  },
  fazione: {
    label: 'Fazione',
    fields: [
      t('nome', 'Nome'), t('sub', 'Sottotitolo'), i('img', 'Emblema'),
      a('emb', 'Emblema & Simbologia'), a('ruolo', 'Ruolo, Influenza & Struttura'),
      a('segni', 'Segni di Riconoscimento & Gergo'), a('rapp', 'Rapporti & Rivalità'),
    ],
  },
  mostro: {
    label: 'Mostro / Statistiche',
    fields: [
      t('nome', 'Nome'), t('tipo', 'Tipo (es. Umanoide Medio, Neutrale)'),
      t('ca', 'Classe Armatura'), t('pf', 'Punti Ferita'), t('vel', 'Velocità'),
      t('car', 'FOR, DES, COS, INT, SAG, CAR (es. 13,12,14,8,10,9)'),
      t('abil', 'Abilità'), t('sensi', 'Sensi'), t('ling', 'Linguaggi'), t('sfida', 'Sfida'),
      a('tratti', 'Tratti Speciali'), a('azioni', 'Azioni'),
    ],
  },
  tabella: {
    label: 'Tabella / Listino',
    fields: [t('titolo', 'Titolo'), a('righe', 'Una riga per voce, colonne separate da | (la prima riga è l’intestazione)')],
  },
  sessione: {
    label: 'Diario di Sessione',
    fields: [
      t('num', 'Numero sessione'), t('titolo', 'Titolo'), t('data', 'Data'),
      a('riassunto', 'Riassunto'), a('eventi', 'Eventi chiave'), a('png', 'PNG incontrati'),
      a('bottino', 'Bottino & Ricompense'), a('ganci', 'Ganci per la prossima sessione'),
    ],
  },
  nota: {
    label: 'Nota',
    fields: [t('titolo', 'Titolo (facoltativo)'), a('testo', 'Testo')],
  },
};

/** Blocchi che si annidano dentro l'ultimo "Luogo" aperto. */
export const NESTED = new Set(['area', 'png', 'oggetto', 'fazione', 'mostro', 'tabella']);

export const titleOf = (block) => block.data.titolo || block.data.nome || '(senza titolo)';
