import { esc } from '../utils/format.js';
import { NESTED } from '../data/blockTypes.js';
import { renderers } from './renderers.js';

/** Trasforma il documento (JSON) nell'HTML impaginato come i manuali di riferimento. */
export class DocumentRenderer {
  render(doc) {
    let html = `<header class="cover"><h1>${esc(doc.title)}</h1>${doc.subtitle ? `<p>${esc(doc.subtitle)}</p>` : ''}</header>`;
    if (doc.toc && doc.sections.length) html += this.#toc(doc.sections);
    return html + doc.sections.map((s) => this.#section(s)).join('');
  }

  #toc(sections) {
    return '<nav class="toc"><h3>Indice</h3>'
      + sections.map((s, i) => `<div>${i + 1}. ${esc(s.title)}</div>`).join('') + '</nav>';
  }

  #section(section) {
    let html = `<section class="level"><h2 class="level-title">${esc(section.title)}</h2>`;
    let open = false;
    let index = 0;
    const close = () => { if (open) { html += '</section>'; open = false; } };

    for (const block of section.blocks) {
      if (block.type === 'luogo') { close(); open = true; index++; }
      else if (!NESTED.has(block.type)) close();
      html += renderers[block.type]?.(block.data, { index }) ?? '';
    }
    close();
    return html + '</section>';
  }
}
