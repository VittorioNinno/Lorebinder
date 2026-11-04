import { slug } from '../utils/format.js';
import { BLOCK_TYPES } from '../data/blockTypes.js';
import { importHtml, linkImages } from '../io/htmlImport.js';
import { resizeImage } from '../utils/image.js';

const $ = (id) => document.getElementById(id);

/** Pulsanti della barra superiore: file JSON/HTML, immagini, tema, stampa/PDF, schede mobile. */
export class Toolbar {
  constructor(store) {
    this.store = store;
    this.#applyTheme(this.#savedTheme());

    $('btn-pdf').onclick = () => { document.body.classList.add('show-preview'); window.print(); };
    $('btn-export').onclick = () => this.#download();
    $('btn-import').onclick = () => $('file-import').click();
    $('file-import').onchange = (e) => this.#import(e.target.files[0], e.target);
    $('btn-import-html').onclick = () => $('file-import-html').click();
    $('file-import-html').onchange = (e) => this.#importHtml(e.target.files[0], e.target);
    $('btn-images').onclick = () => $('dir-images').click();
    $('dir-images').onchange = (e) => this.#linkImages(e.target.files, e.target);
    $('btn-export-html').onclick = () => this.#exportHtml();
    $('btn-new').onclick = () => confirm('Creare un documento vuoto? Il lavoro attuale andrà perso se non l\'hai esportato.') && store.blank();
    $('btn-sample').onclick = () => confirm('Caricare il documento di esempio al posto di quello attuale?') && store.reset();
    $('btn-theme').onclick = () => this.#applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    $('tab-editor').onclick = () => document.body.classList.remove('show-preview');
    $('tab-preview').onclick = () => document.body.classList.add('show-preview');
  }

  async #importHtml(file, input) {
    if (!file) return;
    input.value = '';
    let doc;
    try {
      doc = importHtml(await file.text());
    } catch (e) {
      alert(`Impossibile leggere il manuale HTML: ${e.message}`);
      return;
    }
    const n = doc.sections.reduce((k, s) => k + s.blocks.length, 0);
    if (!confirm(`Trovati ${doc.sections.length} livelli/sezioni e ${n} blocchi in "${doc.sourceTitle || file.name}". `
      + 'Sostituire il documento attuale? (Esporta prima il JSON se vuoi conservarlo.)')) return;
    delete doc.sourceTitle;
    this.store.replace(doc);
    const local = doc.sections.some((s) => s.blocks.some((b) => b.data.imgPath));
    if (local) {
      alert('Il manuale usa immagini salvate sul tuo computer: premi "Collega immagini" e scegli la cartella che le contiene '
        + '(es. la cartella Sol-Aeterna) per incorporarle nel documento.');
    }
  }

  async #linkImages(files, input) {
    if (!files?.length) return;
    const doc = structuredClone(this.store.doc);
    const n = await linkImages(doc, files, resizeImage);
    input.value = '';
    this.store.replace(doc);
    alert(n ? `Immagini collegate: ${n}.` : 'Nessuna immagine del documento corrisponde ai file della cartella scelta.');
  }

  async #exportHtml() {
    const el = document.getElementById('doc-css');
    const css = el.tagName === 'STYLE' ? el.textContent : await (await fetch(el.href)).text();
    const body = document.getElementById('document').innerHTML;
    const title = this.store.doc.title || 'Documento';
    const page = `<!DOCTYPE html>\n<html lang="it">\n<head>\n<meta charset="UTF-8">\n<title>${title.replace(/</g, '&lt;')}</title>\n`
      + '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">\n'
      + `<style>\n${css}\nbody{margin:0;background:#f7f3e8}\n</style>\n</head>\n<body>\n<div class="paper container">\n${body}\n</div>\n</body>\n</html>\n`;
    const blob = new Blob([page], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug(title)}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
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
