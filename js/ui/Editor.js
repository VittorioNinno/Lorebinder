import { BLOCK_TYPES, titleOf, NESTED } from '../data/blockTypes.js';
import { esc } from '../utils/format.js';
import { resizeImage } from '../utils/image.js';

const OPEN_KEY = 'lorebinder:editor-aperti';
const OLD_COLLAPSE_KEY = 'lorebinder:editor-compressi';

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

/**
 * Pannello di modifica: form generati dalla definizione dei tipi di blocco.
 * Ogni voce dell'elenco (sezione o blocco) è aperta o compressa: compressa mostra solo l'intestazione,
 * aperta mostra i campi e le voci annidate (ognuna con il proprio stato).
 * È sincronizzato con l'anteprima: un clic sul titolo porta l'anteprima a quel punto e,
 * scorrendo l'anteprima, l'elenco segue la voce in lettura.
 */
export class Editor {
  constructor(root, store, { preview } = {}) {
    this.root = root;
    this.store = store;
    this.pane = preview ?? null;
    this.parentOf = new Map();   // id voce -> id del genitore (sezione o blocco)
    this.activeId = null;
    this.lockUntil = 0;          // durante lo scorrimento comandato dall'elenco non si risincronizza
    this.renderedAt = 0;
    this.open = this.#loadOpen();
    root.addEventListener('input', (e) => this.#onInput(e));
    root.addEventListener('change', (e) => this.#onChange(e));
    root.addEventListener('click', (e) => this.#onClick(e));
    store.subscribe((_doc, structural) => {
      this.renderedAt = performance.now();
      if (structural) this.render();
    });
    if (this.pane) {
      let queued = false;
      this.pane.addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; this.#syncFromPreview(); });
      }, { passive: true });
    }
  }

  /** Stato iniziale: voci aperte salvate oppure, la prima volta, ricavate dal vecchio stato "compresso". */
  #loadOpen() {
    try {
      const saved = localStorage.getItem(OPEN_KEY);
      if (saved) return new Set(JSON.parse(saved));
      const old = new Set(JSON.parse(localStorage.getItem(OLD_COLLAPSE_KEY) || '[]'));
      const open = new Set();
      for (const s of this.store.doc.sections) {
        if (!old.has(s.id)) open.add(s.id);
        s.blocks.forEach((b) => { if (b.open && !old.has(b.id)) open.add(b.id); });
      }
      return open;
    } catch { return new Set(); }
  }

  render() {
    const { doc } = this.store;
    this.parentOf.clear();
    this.root.innerHTML = `
      <div class="collapse-bar">
        <button type="button" class="sm" data-action="collapse-all" title="Comprime tutte le voci dell'elenco">▸ Comprimi tutto</button>
        <button type="button" class="sm" data-action="expand-all" title="Apre tutte le voci dell'elenco">▾ Espandi tutto</button>
      </div>
      <p class="hint">Usa **grassetto** e *corsivo*. Elenchi, Aree, PNG, Oggetti, Fazioni, Mostri e Tabelle si annidano sotto l'ultimo Luogo; PNG e Oggetti finiscono nell'ultima Area. Clic su un titolo per raggiungerlo nell'anteprima.</p>
      <label>Titolo del documento</label>
      <input type="text" data-meta="title" value="${esc(doc.title)}">
      <label>Sottotitolo</label>
      <input type="text" data-meta="subtitle" value="${esc(doc.subtitle)}">
      <label class="check"><input type="checkbox" data-meta="toc" ${doc.toc ? 'checked' : ''}> Mostra l'indice nel PDF</label>
      ${doc.sections.map((s, si) => this.#section(s, si)).join('')}
      <button type="button" data-action="section-add">+ Nuova sezione</button>`;
    if (this.activeId) this.#markActive(this.activeId);
  }

  #section(section, si) {
    const addButtons = Object.entries(BLOCK_TYPES)
      .map(([type, def]) => `<button type="button" class="sm" data-action="block-add" data-s="${si}" data-type="${type}">+ ${def.label}</button>`)
      .join('');
    const isOpen = this.open.has(section.id);
    const tree = hierarchy(section.blocks);
    const ids = section.blocks.map((b) => b.id);
    const visible = section.blocks.map(() => isOpen);
    const kids = section.blocks.map(() => 0);
    tree.forEach(({ parent }, i) => {
      this.parentOf.set(ids[i], parent >= 0 ? ids[parent] : section.id);
      for (let p = parent; p >= 0; p = tree[p].parent) {
        kids[p] += 1;
        if (!this.open.has(ids[p])) visible[i] = false;
      }
    });
    const body = isOpen ? `${section.blocks.map((b, bi) => visible[bi] ? this.#block(b, si, bi, tree[bi].depth, kids[bi]) : '').join('')}
      <div class="add-row">${addButtons}</div>` : '';
    return `<div class="section${isOpen ? '' : ' is-collapsed'}" data-item="${section.id}">
      <div class="row">
        <button type="button" class="sm twisty" data-action="toggle-section" data-s="${si}" title="${isOpen ? 'Comprimi' : 'Espandi'} la sezione">${isOpen ? '▾' : '▸'}</button>
        <input type="text" data-section-title="${si}" value="${esc(section.title)}" placeholder="Titolo sezione / capitolo / sessione">
        ${isOpen ? '' : `<span class="count" title="Blocchi nella sezione">${section.blocks.length}</span>`}
        <button type="button" class="sm" data-action="goto" data-id="${section.id}" title="Mostra nell'anteprima">◎</button>
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
    const isOpen = this.open.has(block.id);
    const body = isOpen
      ? `<div class="block-body">${def.fields.map((f) => this.#field(f, block.data[f.key], si, bi)).join('')}</div>`
      : '';
    return `<div class="block depth-${depth}${isOpen ? '' : ' is-collapsed'}" data-item="${block.id}">
      <div class="block-head">
        <button type="button" class="sm twisty" data-action="toggle-block" ${ref} title="${isOpen ? 'Comprimi' : 'Espandi'}">${isOpen ? '▾' : '▸'}</button>
        <span class="block-type">${def.label}</span>
        <b class="block-title" data-action="goto" data-id="${block.id}" title="Mostra nell'anteprima">${esc(titleOf(block))}</b>
        ${!isOpen && kids ? `<span class="count" title="Blocchi annidati">+${kids}</span>` : ''}
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
    const blocks = () => st.doc.sections[s].blocks;
    switch (action) {
      case 'section-add': st.addSection(); return this.#reveal(st.doc.sections.at(-1).id);
      case 'section-up': return st.moveSection(s, -1);
      case 'section-down': return st.moveSection(s, 1);
      case 'section-del': return confirm('Eliminare la sezione?') && st.removeSection(s);
      case 'block-add': st.addBlock(s, type); return this.#reveal(blocks().at(-1).id);
      case 'block-up': return st.moveBlock(s, b, -1);
      case 'block-down': return st.moveBlock(s, b, 1);
      case 'block-dup': {
        const wasOpen = this.open.has(blocks()[b].id);
        st.duplicateBlock(s, b);
        if (wasOpen) this.#reveal(blocks()[b + 1].id);
        return;
      }
      case 'block-del': return confirm('Eliminare il blocco?') && st.removeBlock(s, b);
      case 'image-clear': st.setField(s, b, btn.dataset.k, ''); return this.render();
      case 'toggle-section': return this.#toggle(st.doc.sections[s].id);
      case 'toggle-block': return this.#toggle(blocks()[b].id);
      case 'collapse-all': return this.#setAll(false);
      case 'expand-all': return this.#setAll(true);
      case 'goto': return this.#scrollPreviewTo(btn.dataset.id);
    }
  }

  /** Comprimere chiude anche tutte le voci annidate; espandere apre solo la voce scelta. */
  #toggle(id) {
    if (this.open.has(id)) {
      this.open.delete(id);
      for (const [child] of this.parentOf) if (this.#isDescendant(child, id)) this.open.delete(child);
    } else {
      this.open.add(id);
    }
    this.#saveOpen();
    this.render();
  }

  #isDescendant(id, ancestor) {
    for (let p = this.parentOf.get(id); p; p = this.parentOf.get(p)) if (p === ancestor) return true;
    return false;
  }

  /** Apre una voce (e i suoi genitori) dopo averla creata. */
  #reveal(id) {
    this.render(); // aggiorna la mappa dei genitori
    for (let x = id; x; x = this.parentOf.get(x)) this.open.add(x);
    this.#saveOpen();
    this.render();
  }

  #setAll(open) {
    this.open.clear();
    if (open) {
      for (const section of this.store.doc.sections) {
        this.open.add(section.id);
        section.blocks.forEach((b) => this.open.add(b.id));
      }
    }
    this.#saveOpen();
    this.render();
  }

  #saveOpen() {
    // si tengono solo gli id ancora presenti nel documento
    const ids = new Set(this.store.doc.sections.flatMap((s) => [s.id, ...s.blocks.map((b) => b.id)]));
    this.open = new Set([...this.open].filter((id) => ids.has(id)));
    try { localStorage.setItem(OPEN_KEY, JSON.stringify([...this.open])); } catch { /* ignora */ }
  }

  // --- sincronizzazione con l'anteprima ---

  #scrollPreviewTo(id) {
    this.#markActive(id);
    const target = this.pane?.querySelector(`[data-anchor="${CSS.escape(id)}"]`);
    if (!target) return;
    if (!this.pane.offsetParent) document.body.classList.add('show-preview'); // schermi stretti: si passa all'anteprima
    const top = target.getBoundingClientRect().top - this.pane.getBoundingClientRect().top + this.pane.scrollTop - 12;
    this.lockUntil = performance.now() + 1200;
    this.pane.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  #syncFromPreview() {
    const now = performance.now();
    if (now < this.lockUntil || now - this.renderedAt < 300 || !this.root.offsetParent) return;
    const anchors = this.pane.querySelectorAll('[data-anchor]');
    if (!anchors.length) return;
    // ultima ancora il cui inizio è sopra la linea di lettura (ricerca binaria: l'ordine è quello del documento)
    const line = this.pane.getBoundingClientRect().top + 60;
    let lo = 0;
    let hi = anchors.length - 1;
    let found = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (anchors[mid].getBoundingClientRect().top <= line) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    const id = anchors[found].dataset.anchor;
    if (id === this.activeId) return;
    // se la voce è nascosta in un genitore compresso si segue il genitore visibile più vicino
    let item = null;
    for (let x = id; x && !item; x = this.parentOf.get(x)) item = this.root.querySelector(`[data-item="${CSS.escape(x)}"]`);
    this.#markActive(id);
    if (!item) return;
    const head = item.firstElementChild ?? item;
    const bar = this.root.querySelector('.collapse-bar')?.offsetHeight ?? 0;
    const delta = head.getBoundingClientRect().top - this.root.getBoundingClientRect().top - bar - 8;
    this.root.scrollTop += delta;
  }

  #markActive(id) {
    this.activeId = id;
    this.root.querySelectorAll('.is-active').forEach((el) => el.classList.remove('is-active'));
    let item = null;
    for (let x = id; x && !item; x = this.parentOf.get(x)) item = this.root.querySelector(`[data-item="${CSS.escape(x)}"]`);
    (item?.firstElementChild)?.classList.add('is-active');
  }
}
