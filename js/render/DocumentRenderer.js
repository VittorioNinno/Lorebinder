import { esc, bullets } from '../utils/format.js';
import { NESTED } from '../data/blockTypes.js';
import { renderers, subBlock } from './renderers.js';

const DEFAULT_TITLES = {
  vie: 'Vie d’Accesso & Snodi Stradali',
  fazione: 'Equilibri di Potere & Fazioni Locali',
  area: 'Aree, Settori & PNG Residenti',
};

/**
 * Trasforma il documento (JSON) nell'HTML impaginato come il manuale di riferimento (Sol-Aeterna.html):
 * ogni sezione è un "level-wrapper", ogni Luogo una "poi-card" che contiene sotto-blocchi
 * (vie d'accesso, elenchi, fazioni, aree) in cui si annidano PNG, oggetti e statistiche.
 */
export class DocumentRenderer {
  render(doc) {
    let html = doc.title || doc.subtitle
      ? `<header class="cover"><h1>${esc(doc.title)}</h1>${doc.subtitle ? `<p>${esc(doc.subtitle)}</p>` : ''}</header>`
      : '';
    if (doc.toc && doc.sections.length) html += this.#toc(doc.sections);
    return html + doc.sections.map((s) => this.#section(s)).join('');
  }

  #toc(sections) {
    return '<nav class="toc"><h3>Indice</h3>'
      + sections.map((s, i) => `<div>${i + 1}. ${esc(s.title)}</div>`).join('') + '</nav>';
  }

  #section(section) {
    let html = `<div class="level-wrapper">${section.title ? `<h2 class="level-title">${esc(section.title)}</h2>` : ''}`;
    let card = null;      // dati del Luogo aperto
    let sub = null;       // tipo del sotto-blocco aperto: 'vie' | 'elenco' | 'fazione' | 'area' | 'aree'
    let area = false;     // contenitore della sotto-area aperto
    let counter = 0;

    const closeArea = () => { if (area) { html += '</div>'; area = false; } };
    const closeSub = () => { closeArea(); if (sub) { html += '</div>'; sub = null; } };
    const closeCard = () => { closeSub(); if (card) { html += '</div>'; card = null; } };
    const openSub = (kind, title, body) => { closeSub(); html += subBlock(title, body); sub = kind; };

    for (const block of section.blocks) {
      const d = block.data ?? {};
      const type = block.type;

      if (type === 'luogo') {
        closeCard();
        const n = String(d.num ?? '').trim();
        const number = n === '-' ? '' : n || String(++counter);
        html += renderers.luogo(d, { number });
        card = d;
        if (d.vie) openSub('vie', d.titVie || DEFAULT_TITLES.vie, bullets(d.vie));
        if (d.aree) openSub('aree', d.titAree || DEFAULT_TITLES.area, bullets(d.aree));
        continue;
      }

      if (!NESTED.has(type)) { closeCard(); html += renderers[type]?.(d) ?? ''; continue; }

      if (card) {
        if (type === 'elenco') { openSub('elenco', d.titolo || 'Elenco', renderers.elenco(d)); continue; }
        if (type === 'fazione' && sub !== 'fazione') openSub('fazione', card.titFazioni || DEFAULT_TITLES.fazione, '');
        if (type === 'area') {
          if (sub !== 'area') openSub('area', card.titAree || DEFAULT_TITLES.area, '');
          closeArea();
          html += renderers.area(d);
          area = true;
          continue;
        }
      } else if (type === 'area') {
        html += renderers.area(d) + '</div>';
        continue;
      } else if (type === 'elenco') {
        html += subBlock(d.titolo || 'Elenco', renderers.elenco(d)) + '</div>';
        continue;
      }
      html += renderers[type]?.(d) ?? '';
    }
    closeCard();
    return html + '</div>';
  }
}
