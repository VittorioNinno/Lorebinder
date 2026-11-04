import { esc, inline, bullets, lines, modifier } from '../utils/format.js';

const field = (label, v) =>
  v ? `<div class="entity-field"><strong class="entity-label">${label}:</strong> ${inline(v)}</div>` : '';
const pic = (cls, img) => (img ? `<div class="${cls}"><img src="${esc(img)}" alt=""></div>` : '');
const sub = (title, v) => `<div class="sub"><span class="sub-title">${title}</span>${bullets(v)}</div>`;
const statLine = (label, v) => (v ? `<div class="stat-line"><strong>${label}:</strong> ${inline(v)}</div>` : '');
const entity = (mod, name, img, body) =>
  `<div class="entity entity--${mod}"><div class="entity-name">${name}</div>${pic('entity-pic', img)}${body}</div>`;
const withSub = (name, s) => esc(name) + (s ? ` (${esc(s)})` : '');

/**
 * Un renderer per tipo di blocco: (data, ctx) => stringa HTML.
 * Il renderer "luogo" restituisce una scheda APERTA: la chiude DocumentRenderer.
 */
export const renderers = {
  luogo(d, { index }) {
    const specs = [['Orari', d.orari], ['Permessi', d.permessi], ['Sorveglianza &amp; Rischi', d.sorv],
      ['Pericoli Ambientali', d.pericoli]]
      .filter(([, v]) => v)
      .map(([l, v]) => `<strong>${l}:</strong> ${inline(v)}`)
      .join(' &nbsp;|&nbsp; ');
    return `<section class="poi-card"><h3 class="poi-title">${index}. ${esc(d.titolo)}</h3>`
      + pic('env-image', d.img)
      + (d.lettura ? `<div class="read-aloud">${inline(d.lettura)}</div>` : '')
      + (specs ? `<div class="specs">${specs}</div>` : '')
      + (d.vie ? sub('Vie d’Accesso &amp; Snodi', d.vie) : '')
      + (d.aree ? sub('Aree, Settori &amp; PNG Residenti', d.aree) : '');
  },

  area(d) {
    return (d.settore ? `<div class="settore-title">${esc(d.settore)}</div>` : '')
      + `<div class="area-item">&bull; <strong>${esc(d.titolo)}:</strong> ${inline(d.descr)}</div>`;
  },

  png(d) {
    const who = [d.razza, d.ruolo].filter(Boolean).map(esc).join(' — ');
    return entity('png', esc(d.nome) + (who ? ` (${who})` : ''), d.img,
      field('Aspetto Fisico &amp; Vestiario', d.aspetto)
      + field('Segni Particolari, Prossemica &amp; Voce', d.segni)
      + field('Psicologia &amp; Reazioni al Tavolo', d.psi)
      + field('Argomenti Preferiti', d.arg)
      + field('Segreti, Tariffe &amp; Nozioni Rivelabili', d.segr));
  },

  oggetto(d) {
    return entity('oggetto', withSub(d.nome, d.sub), d.img,
      field('Natura &amp; Manifattura', d.natura)
      + field('Proprietà &amp; Meccanica d’Uso', d.prop)
      + field('Collocazione &amp; Come Ottenerlo', d.coll));
  },

  fazione(d) {
    return entity('fazione', withSub(d.nome, d.sub), d.img,
      field('Emblema &amp; Simbologia', d.emb)
      + field('Ruolo, Influenza &amp; Struttura', d.ruolo)
      + field('Segni di Riconoscimento &amp; Gergo', d.segni)
      + field('Rapporti &amp; Rivalità', d.rapp));
  },

  mostro(d) {
    const names = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'];
    const v = String(d.car ?? '').split(/[,\s/]+/).filter(Boolean);
    const table = v.length
      ? `<table class="stat-table"><tr>${names.map((n) => `<th>${n}</th>`).join('')}</tr>`
        + `<tr>${names.map((_, i) => `<td>${modifier(v[i])}</td>`).join('')}</tr></table>`
      : '';
    return `<div class="stat"><div class="stat-name">${esc(d.nome)}</div><div class="stat-type">${esc(d.tipo)}</div>`
      + statLine('Classe Armatura', d.ca) + statLine('Punti Ferita', d.pf) + statLine('Velocità', d.vel)
      + table
      + statLine('Abilità', d.abil) + statLine('Sensi', d.sensi) + statLine('Linguaggi', d.ling) + statLine('Sfida', d.sfida)
      + (d.tratti ? `<div class="stat-section">Tratti Speciali</div><div class="stat-line">${inline(d.tratti)}</div>` : '')
      + (d.azioni ? `<div class="stat-section">Azioni</div><div class="stat-line">${inline(d.azioni)}</div>` : '')
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
    return entity('sessione', name, '',
      field('Riassunto', d.riassunto) + field('Eventi Chiave', d.eventi) + field('PNG Incontrati', d.png)
      + field('Bottino &amp; Ricompense', d.bottino) + field('Ganci per la Prossima Sessione', d.ganci));
  },

  nota(d) {
    return `<div class="note">${d.titolo ? `<h3>${esc(d.titolo)}</h3>` : ''}${inline(d.testo)}</div>`;
  },
};
