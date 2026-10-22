import { BLOCK_TYPES, titleOf } from '../data/blockTypes.js';
import { esc } from '../utils/format.js';
import { resizeImage } from '../utils/image.js';

/** Pannello di modifica: form generati dalla definizione dei tipi di blocco. */
export class Editor {
  constructor(root, store) {
    this.root = root;
    this.store = store;
    root.addEventListener('input', (e) => this.#onInput(e));
    root.addEventListener('change', (e) => this.#onChange(e));
    root.addEventListener('click', (e) => this.#onClick(e));
    store.subscribe((_doc, structural) => { if (structural) this.render(); });
  }

  render() {
    const { doc } = this.store;
    this.root.innerHTML = `
      <p class="hint">Usa **grassetto** e *corsivo*. PNG, Oggetti, Fazioni, Mostri e Tabelle si annidano sotto l'ultimo Luogo.</p>
      <label>Titolo del documento</label>
      <input type="text" data-meta="title" value="${esc(doc.title)}">
      <label>Sottotitolo</label>
      <input type="text" data-meta="subtitle" value="${esc(doc.subtitle)}">
      <label class="check"><input type="checkbox" data-meta="toc" ${doc.toc ? 'checked' : ''}> Mostra l'indice nel PDF</label>
      ${doc.sections.map((s, si) => this.#section(s, si)).join('')}
      <button type="button" data-action="section-add">+ Nuova sezione</button>`;
  }

  #section(section, si) {
    const addButtons = Object.entries(BLOCK_TYPES)
      .map(([type, def]) => `<button type="button" class="sm" data-action="block-add" data-s="${si}" data-type="${type}">+ ${def.label}</button>`)
      .join('');
    return `<div class="section">
      <div class="row">
        <input type="text" data-section-title="${si}" value="${esc(section.title)}" placeholder="Titolo sezione / capitolo / sessione">
        <button type="button" class="sm" data-action="section-up" data-s="${si}">↑</button>
        <button type="button" class="sm" data-action="section-down" data-s="${si}">↓</button>
        <button type="button" class="sm" data-action="section-del" data-s="${si}">✕</button>
      </div>
      ${section.blocks.map((b, bi) => this.#block(b, si, bi)).join('')}
      <div class="add-row">${addButtons}</div>
    </div>`;
  }

  #block(block, si, bi) {
    const def = BLOCK_TYPES[block.type];
    const ref = `data-s="${si}" data-b="${bi}"`;
    const body = block.open
      ? `<div class="block-body">${def.fields.map((f) => this.#field(f, block.data[f.key], si, bi)).join('')}</div>`
      : '';
    return `<div class="block">
      <div class="block-head">
        <span class="block-type">${def.label}</span>
        <b class="block-title" data-action="block-toggle" ${ref}>${esc(titleOf(block))}</b>
        <button type="button" class="sm" data-action="block-dup" ${ref} title="Duplica">⧉</button>
        <button type="button" class="sm" data-action="block-up" ${ref}>↑</button>
        <button type="button" class="sm" data-action="block-down" ${ref}>↓</button>
        <button type="button" class="sm" data-action="block-del" ${ref}>✕</button>
      </div>${body}</div>`;
  }

  #field(f, value, si, bi) {
    const ref = `data-s="${si}" data-b="${bi}" data-k="${f.key}"`;
    const label = `<label>${f.label}</label>`;
    if (f.kind === 'text') return `${label}<input type="text" ${ref} value="${esc(value)}">`;
    if (f.kind === 'textarea') return `${label}<textarea ${ref}>${esc(value)}</textarea>`;
    return `${label}<input type="file" accept="image/*" ${ref}>`
      + (value ? `<img class="thumb" src="${esc(value)}" alt=""> <button type="button" class="sm" data-action="image-clear" ${ref}>Rimuovi</button>` : '');
  }

  #onInput(e) {
    const t = e.target;
    if (t.type === 'file') return;
    const d = t.dataset;
    if (d.meta) return this.store.setMeta(d.meta, t.type === 'checkbox' ? t.checked : t.value);
    if (d.sectionTitle !== undefined) return this.store.setSectionTitle(+d.sectionTitle, t.value);
    if (d.k) {
      this.store.setField(+d.s, +d.b, d.k, t.value);
      if (d.k === 'titolo' || d.k === 'nome') {
        const label = t.closest('.block')?.querySelector('.block-title');
        if (label) label.textContent = t.value || '(senza titolo)';
      }
    }
  }

  async #onChange(e) {
    const t = e.target;
    if (t.type !== 'file' || !t.files[0]) return;
    const { s, b, k } = t.dataset;
    this.store.setField(+s, +b, k, await resizeImage(t.files[0]));
    this.render();
  }

  #onClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, type } = btn.dataset;
    const s = +btn.dataset.s;
    const b = +btn.dataset.b;
    const st = this.store;
    switch (action) {
      case 'section-add': return st.addSection();
      case 'section-up': return st.moveSection(s, -1);
      case 'section-down': return st.moveSection(s, 1);
      case 'section-del': return confirm('Eliminare la sezione?') && st.removeSection(s);
      case 'block-add': return st.addBlock(s, type);
      case 'block-up': return st.moveBlock(s, b, -1);
      case 'block-down': return st.moveBlock(s, b, 1);
      case 'block-dup': return st.duplicateBlock(s, b);
      case 'block-toggle': return st.toggleBlock(s, b);
      case 'block-del': return confirm('Eliminare il blocco?') && st.removeBlock(s, b);
      case 'image-clear': st.setField(s, b, btn.dataset.k, ''); return this.render();
    }
  }
}
