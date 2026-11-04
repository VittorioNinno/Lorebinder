import { esc, inline, bullets, lines, modifier } from '../utils/format.js';

/*
 * Un renderer per tipo di blocco: (data, ctx) => stringa HTML.
 * Markup e classi replicano 1:1 il manuale di riferimento (Sol-Aeterna.html):
 * poi-card, poi-sub-block, npc/item/faction-inline-card, stat-block.
 * L'apertura e la chiusura di schede e sotto-blocchi è gestita da DocumentRenderer.
 */

const field = (cls, label, v) =>
  v ? `<div class="card-field"><strong class="${cls}">${label}:</strong> ${inline(v)}</div>` : '';
const pic = (cls, img, alt) => (img ? `<div class="${cls}"><img src="${esc(img)}" alt="${esc(alt)}"></div>` : '');
const withSub = (name, s) => esc(name) + (s ? ` (${esc(s)})` : '');
const statLine = (label, v) => (v ? `<div class="stat-line"><strong>${label}:</strong> ${inline(v)}</div>` : '');
const statLines = (v) => lines(v).map((l) => `<div class="stat-line">${inline(l)}</div>`).join('');

/** Apertura di un sotto-blocco con titolo (Vie d'accesso, Fazioni, Aree, Architettura...). */
export const subBlock = (title, body = '') =>
  `<div class="poi-sub-block"><span class="poi-sub-block-title">${esc(title)}:</span>${body}`;

/** "Etichetta: valore" -> <strong>Etichetta:</strong> valore */
const specItem = (line) => {
  const m = line.match(/^\s*([^:]{1,60}):\s*(.*)$/);
  return m ? `<strong>${esc(m[1])}:</strong> ${inline(m[2])}` : inline(line);
};

export const renderers = {
  /** Restituisce l'intestazione della scheda (APERTA): titolo, immagine, lettura e specifiche. */
  luogo(d, { number }) {
    const specs = [['Orari', d.orari], ['Permessi', d.permessi], ['Sorveglianza &amp; Rischi', d.sorv],
      ['Pericoli Ambientali', d.pericoli]]
      .filter(([, v]) => v)
      .map(([l, v]) => `<strong>${l}:</strong> ${inline(v)}`)
      .concat(lines(d.specs).map(specItem))
      .join(' &nbsp;|&nbsp; ');
    return `<div class="poi-card"><div class="poi-title">${number ? `${esc(number)}. ` : ''}${esc(d.titolo)}</div>`
      + pic('env-asset-box', d.img, d.titolo)
      + (d.lettura ? `<div class="read-aloud">${inline(d.lettura)}</div>` : '')
      + (specs ? `<div class="poi-specs">${specs}</div>` : '');
  },

  /** Testo della sotto-area (il contenitore è aperto/chiuso da DocumentRenderer). */
  area(d) {
    return (d.settore ? `<div class="settore-title">${esc(d.settore)}</div>` : '')
      + `<div class="area-block"><div class="area-text">&bull; <strong>${esc(d.titolo)}:</strong> ${inline(d.descr)}</div>`;
  },

  png(d) {
    const who = [d.razza, d.ruolo].filter(Boolean).map(esc).join(' — ');
    return '<div class="npc-inline-card">'
      + `<div class="npc-name">${esc(d.nome)}${who ? ` (${who})` : ''}</div>`
      + pic('npc-portrait-box', d.img, `Ritratto di ${d.nome}`)
      + field('npc-label', 'Aspetto Fisico &amp; Vestiario', d.aspetto)
      + field('npc-label', 'Segni Particolari, Prossemica &amp; Voce', d.segni)
      + field('npc-label', 'Psicologia &amp; Reazioni al Tavolo', d.psi)
      + field('npc-label', 'Argomenti Preferiti', d.arg)
      + field('npc-label', 'Segreti, Tariffe &amp; Nozioni Rivelabili', d.segr)
      + '</div>';
  },

  oggetto(d) {
    return '<div class="item-inline-card">'
      + `<div class="item-name">${withSub(d.nome, d.sub)}</div>`
      + pic('item-portrait-box', d.img, d.nome)
      + field('item-label', 'Natura &amp; Manifattura', d.natura)
      + field('item-label', 'Proprietà &amp; Meccanica d’Uso', d.prop)
      + field('item-label', 'Collocazione &amp; Come Ottenerlo', d.coll)
      + '</div>';
  },

  fazione(d) {
    const def = ['Emblema & Simbologia Cifrata', 'Ruolo, Influenza & Struttura', 'Segni di Riconoscimento & Gergo', 'Rapporti & Rivalità'];
    const custom = String(d.lab ?? '').split('|').map((s) => s.trim());
    const lab = def.map((l, k) => esc(custom[k] || l));
    return '<div class="faction-inline-card">'
      + `<div class="faction-name">${withSub(d.nome, d.sub)}</div>`
      + pic('faction-portrait-box', d.img, `Emblema di ${d.nome}`)
      + field('faction-label', lab[0], d.emb)
      + field('faction-label', lab[1], d.ruolo)
      + field('faction-label', lab[2], d.segni)
      + field('faction-label', lab[3], d.rapp)
      + '</div>';
  },

  mostro(d) {
    const names = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'];
    const v = String(d.car ?? '').split(/[,\s/]+/).filter(Boolean);
    const table = v.length
      ? `<table class="stat-table"><thead><tr>${names.map((n) => `<th>${n}</th>`).join('')}</tr></thead>`
        + `<tbody><tr>${names.map((_, k) => `<td>${modifier(v[k])}</td>`).join('')}</tr></tbody></table>`
      : '';
    return `<div class="stat-block"><div class="stat-name">${esc(d.nome)}</div><div class="stat-type">${esc(d.tipo)}</div>`
      + statLine('Classe Armatura', d.ca) + statLine('Punti Ferita', d.pf) + statLine('Velocità', d.vel)
      + table
      + statLine('Abilità', d.abil) + statLine('Sensi', d.sensi) + statLine('Linguaggi', d.ling) + statLine('Sfida', d.sfida)
      + (d.tratti ? `<div class="stat-section-title">Tratti Speciali</div>${statLines(d.tratti)}` : '')
      + (d.azioni ? `<div class="stat-section-title">Azioni</div>${statLines(d.azioni)}` : '')
      + '</div>';
  },

  tabella(d) {
    const rows = lines(d.righe).map((r) => r.split('|').map((c) => inline(c.trim())));
    if (!rows.length) return '';
    const [head, ...body] = rows;
    return (d.titolo ? `<div class="table-title">${esc(d.titolo)}</div>` : '')
      + `<table class="data-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead>`
      + `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  },

  sessione(d) {
    const name = `Sessione ${esc(d.num)}` + (d.titolo ? ` — ${esc(d.titolo)}` : '') + (d.data ? ` (${esc(d.data)})` : '');
    return `<div class="npc-inline-card session-card"><div class="npc-name">${name}</div>`
      + field('npc-label', 'Riassunto', d.riassunto) + field('npc-label', 'Eventi Chiave', d.eventi)
      + field('npc-label', 'PNG Incontrati', d.png) + field('npc-label', 'Bottino &amp; Ricompense', d.bottino)
      + field('npc-label', 'Ganci per la Prossima Sessione', d.ganci) + '</div>';
  },

  nota(d) {
    return `<div class="note">${d.titolo ? `<h3>${esc(d.titolo)}</h3>` : ''}${inline(d.testo)}</div>`;
  },

  elenco(d) {
    return bullets(d.righe);
  },
};
