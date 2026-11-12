import { BLOCK_TYPES, titleOf, NESTED } from '../data/blockTypes.js';
import { esc } from '../utils/format.js';
import { resizeImage } from '../utils/image.js';

const COLLAPSE_KEY = 'lorebinder:editor-compressi';

/**
 * Calcola la gerarchia dei blocchi di una sezione, con le stesse regole dell'impaginazione:
 * i blocchi annidati appartengono all'ultimo Luogo; PNG, Oggetti, Mostri e Tabelle all'ultima Area.
 * Restituisce per ogni blocco l'indice del genitore (o -1) e la profondità.
 */
function hierarchy(blocks) {
  let luogo = -1;
  let area = -1;
  return blocks.map((b, i) => {
    if (b.type === 'luogo') { luogo = i; area = -1; return { parent: -1, depth: 0 }; }
    if (!NESTED.has(b.type)) { luogo = -1; area = -1; return { parent: -1, depth: 0 }; }
    if (b.type === 'area') { area = i; return { parent: luogo, depth: luogo < 0 ? 0 : 1 }; }
    if (b.type === 'elenco' || b.type === 'fazione') { area = -1; return { parent: luogo, depth: luogo < 0 ? 0 : 1 }; }
    const parent = area >= 0 ? area : luogo;
    return { parent, depth: parent < 0 ? 0 : (parent === area ? (luogo < 0 ? 1 : 2) : 1) };
  });
}

/** Pannello di modifica: form generati dalla definizione dei tipi di blocco. */
export class Editor {
  constructor(root, store) {
    this.root = root;
    this.store = store;
    // Voci compresse nell'elenco dell'editor (solo interfaccia: non cambia il documento né il PDF)
    try { this.collapsed = new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')); }
    catch { this.collapsed = new Set(); }
    root.addEventListener('input', (e) => this.#onInput(e));
    root.addEventListener('change', (e) => this.#onChange(e));
    root.addEventListener('click', (e) => this.#onClick(e));
    store.subscribe((_doc, structural) => { if (structural) this.render(); });
  }

  render() {
    const { doc } = this.store;
    this.root.innerHTML = `
      <p class="hint">Usa **grassetto** e *corsivo*. Elenchi, Aree, PNG, Oggetti, Fazioni, Mostri e Tabelle si annidano sotto l'ultimo Luogo; PNG e Oggetti finiscono nell'ultima Area.</p>
      <label>Titolo del documento</label>
      <input type="text" data-meta="title" value="${esc(doc.title)}">
      <label>Sottotitolo</label>
      <input type="text" data-meta="subtitle" value="${esc(doc.subtitle)}">
      <label class="check"><input type="checkbox" data-meta="toc" ${doc.toc ? 'checked' : ''}> Mostra l'indice nel PDF</label>
      <div class="collapse-bar">
        <button type="button" class="sm" data-action="collapse-all" title="Comprime sezioni, Luoghi e Aree nell'elenco">▸ Comprimi tutto</button>
        <button type="button" class="sm" data-action="expand-all">▾ Espandi tutto</button>
      </div>
      ${doc.sections.map((s, si) => this.#section(s, si)).join('')}
      <button type="button" data-action="section-add">+ Nuova sezione</button>`;
  }

  #section(section, si) {
    const addButtons = Object.entries(BLOCK_TYPES)
      .map(([type, def]) => `<button type="button" class="sm" data-action="block-add" data-s="${si}" data-type="${type}">+ ${def.label}</button>`)
      .join('');
    const closed = this.collapsed.has(section.id);
    const tree = hierarchy(section.blocks);
    const hidden = section.blocks.map(() => false);
    const children = section.blocks.map(() => 0);
    tree.forEach(({ parent }, i) => {
      for (let p = parent; p >= 0; p = tree[p].parent) children[p] += 1;
      for (let p = parent; p >= 0; p = tree[p].parent) if (this.collapsed.has(section.blocks[p].id)) hidden[i] = true;
    });
    const body = closed ? '' : `${section.blocks.map((b, bi) => hidden[bi] ? '' : this.#block(b, si, bi, tree[bi].depth, children[bi])).join('')}
      <div class="add-row">${addButtons}</div>`;
    return `<div class="section${closed ? ' is-collapsed' : ''}">
      <div class="row">
        <button type="button" class="sm twisty" data-action="collapse-section" data-s="${si}" title="${closed ? 'Espandi' : 'Comprimi'} la sezione">${closed ? '▸' : '▾'}</button>
        <input type="text" data-section-title="${si}" value="${esc(section.title)}" placeholder="Titolo sezione / capitolo / sessione">
        ${closed ? `<span class="count" title="Blocchi nella sezione">${section.blocks.length}</span>` : ''}
        <button type="button" class="sm" data-action="section-up" data-s="${si}">↑</button>
        <button type="button" class="sm" data-action="section-down" data-s="${si}">↓</button>
        <button type="button" class="sm" data-action="section-del" data-s="${si}">✕</button>
      </div>
      ${body}
    </div>`;
  }

  #block(block, si, bi, depth = 0, kids = 0) {
    const def = BLOCK_TYPES[block.type] ?? { label: `Tipo sconosciuto (${block.type})`, fields: [] };
    const ref = `data-s="${si}" data-b="${bi}"`;
    const body = block.open
      ? `<div class="block-body">${def.fields.map((f) => this.#field(f, block.data[f.key], si, bi)).join('')}</div>`
      : '';
    const closed = kids > 0 && this.collapsed.has(block.id);
    const twisty = kids
      ? `<button type="button" class="sm twisty" data-action="collapse-block" ${ref} title="${closed ? 'Mostra' : 'Nascondi'} i ${kids} blocchi annidati">${closed ? '▸' : '▾'}</button>`
      : '<span class="twisty-space"></span>';
    return `<div class="block depth-${depth}${closed ? ' is-collapsed' : ''}">
      <div class="block-head">
        ${twisty}
        <span class="block-type">${def.label}</span>
        <b class="block-title" data-action="block-toggle" ${ref}>${esc(titleOf(block))}</b>
        ${closed ? `<span class="count" title="Blocchi annidati nascosti">+${kids}</span>` : ''}
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
      case 'collapse-section': return this.#toggleCollapsed(st.doc.sections[s].id);
      case 'collapse-block': return this.#toggleCollapsed(st.doc.sections[s].blocks[b].id);
      case 'collapse-all': return this.#setAll(true);
      case 'expand-all': return this.#setAll(false);
    }
  }

  #toggleCollapsed(id) {
    if (this.collapsed.has(id)) this.collapsed.delete(id); else this.collapsed.add(id);
    this.#saveCollapsed();
    this.render();
  }

  /** Comprime (o espande) sezioni, Luoghi e Aree con contenuto annidato. */
  #setAll(collapse) {
    this.collapsed.clear();
    if (collapse) {
      for (const section of this.store.doc.sections) {
        this.collapsed.add(section.id);
        const tree = hierarchy(section.blocks);
        const parents = new Set(tree.map((t) => t.parent).filter((p) => p >= 0));
        parents.forEach((i) => this.collapsed.add(section.blocks[i].id));
      }
    }
    this.#saveCollapsed();
    this.render();
  }

  #saveCollapsed() {
    // si tengono solo gli id ancora presenti nel documento
    const ids = new Set(this.store.doc.sections.flatMap((s) => [s.id, ...s.blocks.map((b) => b.id)]));
    this.collapsed = new Set([...this.collapsed].filter((id) => ids.has(id)));
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...this.collapsed])); } catch { /* ignora */ }
  }
}
