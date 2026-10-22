import { SAMPLE } from '../data/sample.js';
import { uid } from '../utils/format.js';

const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
};

/** Stato del documento + persistenza su localStorage. I listener ricevono (doc, structural). */
export class Store {
  constructor(key = 'lore-pdf-generator:v1') {
    this.key = key;
    this.listeners = new Set();
    this.doc = this.#load();
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  #emit(structural) {
    try { localStorage.setItem(this.key, JSON.stringify(this.doc)); } catch { /* storage non disponibile */ }
    this.listeners.forEach((fn) => fn(this.doc, structural));
  }

  #load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return Store.normalize(JSON.parse(raw));
    } catch { /* dati corrotti: si riparte dall'esempio */ }
    return Store.normalize(structuredClone(SAMPLE));
  }

  static normalize(doc) {
    doc.title ??= ''; doc.subtitle ??= ''; doc.toc ??= true; doc.sections ??= [];
    doc.sections.forEach((s) => {
      s.id ??= uid(); s.title ??= ''; s.blocks ??= [];
      s.blocks.forEach((b) => { b.id ??= uid(); b.data ??= {}; b.open ??= false; });
    });
    return doc;
  }

  // --- metadati e campi (non strutturali: l'editor non si ridisegna) ---
  setMeta(key, value) { this.doc[key] = value; this.#emit(false); }
  setSectionTitle(s, value) { this.doc.sections[s].title = value; this.#emit(false); }
  setField(s, b, key, value) { this.doc.sections[s].blocks[b].data[key] = value; this.#emit(false); }

  // --- struttura ---
  addSection() { this.doc.sections.push({ id: uid(), title: 'Nuova sezione', blocks: [] }); this.#emit(true); }
  removeSection(s) { this.doc.sections.splice(s, 1); this.#emit(true); }
  moveSection(s, d) { move(this.doc.sections, s, d); this.#emit(true); }
  addBlock(s, type) { this.doc.sections[s].blocks.push({ id: uid(), type, open: true, data: {} }); this.#emit(true); }
  removeBlock(s, b) { this.doc.sections[s].blocks.splice(b, 1); this.#emit(true); }
  moveBlock(s, b, d) { move(this.doc.sections[s].blocks, b, d); this.#emit(true); }
  toggleBlock(s, b) { const x = this.doc.sections[s].blocks[b]; x.open = !x.open; this.#emit(true); }
  duplicateBlock(s, b) {
    const blocks = this.doc.sections[s].blocks;
    const copy = structuredClone(blocks[b]);
    copy.id = uid();
    blocks.splice(b + 1, 0, copy);
    this.#emit(true);
  }

  // --- documento intero ---
  replace(doc) { this.doc = Store.normalize(doc); this.#emit(true); }
  reset() { this.replace(structuredClone(SAMPLE)); }
  blank() { this.replace({ title: 'Nuovo documento', subtitle: '', toc: true, sections: [] }); }
  toJSON() { return JSON.stringify(this.doc, null, 2); }
}
