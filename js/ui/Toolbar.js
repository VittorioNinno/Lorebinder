import { slug } from '../utils/format.js';
import { BLOCK_TYPES } from '../data/blockTypes.js';

const $ = (id) => document.getElementById(id);

/** Pulsanti della barra superiore: file JSON, tema, stampa/PDF, schede mobile. */
export class Toolbar {
  constructor(store) {
    this.store = store;
    this.#applyTheme(this.#savedTheme());

    $('btn-pdf').onclick = () => { document.body.classList.add('show-preview'); window.print(); };
    $('btn-export').onclick = () => this.#download();
    $('btn-import').onclick = () => $('file-import').click();
    $('file-import').onchange = (e) => this.#import(e.target.files[0], e.target);
    $('btn-new').onclick = () => confirm('Creare un documento vuoto? Il lavoro attuale andrà perso se non l\'hai esportato.') && store.blank();
    $('btn-sample').onclick = () => confirm('Caricare il documento di esempio al posto di quello attuale?') && store.reset();
    $('btn-theme').onclick = () => this.#applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    $('tab-editor').onclick = () => document.body.classList.remove('show-preview');
    $('tab-preview').onclick = () => document.body.classList.add('show-preview');
  }

  #savedTheme() {
    try { return localStorage.getItem('lore-pdf-generator:theme'); } catch { return null; }
  }

  #applyTheme(theme) {
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('lore-pdf-generator:theme', theme); } catch { /* ignora */ }
  }

  #download() {
    const blob = new Blob([this.store.toJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug(this.store.doc.title)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async #import(file, input) {
    if (!file) return;
    let doc;
    try {
      doc = JSON.parse(await file.text());
      if (!Array.isArray(doc.sections)) throw new Error('formato non valido');
    } catch {
      alert('File JSON non valido.');
      input.value = '';
      return;
    }
    // Controllo dei tipi PRIMA di sostituire il documento: un file non supportato non deve sovrascrivere il lavoro salvato
    const unknown = [...new Set(doc.sections.flatMap((s) => (s.blocks ?? []).map((b) => b.type)))]
      .filter((t) => !BLOCK_TYPES[t]);
    if (unknown.length) {
      alert(`Il file usa tipi di blocco che questa versione di Lorebinder non conosce: ${unknown.join(', ')}.\n`
        + 'Ricarica la pagina con Ctrl+F5 per ottenere la versione aggiornata e riprova. Il documento attuale non è stato modificato.');
      input.value = '';
      return;
    }
    try {
      this.store.replace(doc);
    } catch (e) {
      alert(`Il file è stato letto ma non può essere mostrato: ${e.message}`);
    }
    input.value = '';
  }
}
