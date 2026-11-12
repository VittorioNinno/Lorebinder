import { Store } from './core/Store.js';
import { DocumentRenderer } from './render/DocumentRenderer.js?v=20261113';
import { Preview } from './ui/Preview.js';
import { Editor } from './ui/Editor.js?v=20261113';
import { Toolbar } from './ui/Toolbar.js';

const store = new Store();
await store.load();
const preview = new Preview(document.getElementById('document'), new DocumentRenderer());
const editor = new Editor(document.getElementById('editor'), store, { preview: document.querySelector('.preview-pane') });
new Toolbar(store);

store.subscribe((doc) => preview.render(doc));
try {
  editor.render();
  preview.render(store.doc);
} catch (e) {
  // Documento salvato non visualizzabile: niente pagina bianca, si offre un backup e il ripristino
  const root = document.getElementById('editor');
  root.innerHTML = `<p class="hint"><strong>Il documento salvato nel browser non può essere mostrato</strong> (${e.message}).
    Prova prima a ricaricare la pagina con Ctrl+F5; se il problema resta, scarica il backup e ripristina l'esempio.</p>
    <button type="button" id="rescue-backup">Scarica backup JSON</button>
    <button type="button" id="rescue-reset">Ripristina l'esempio</button>`;
  document.getElementById('rescue-backup').onclick = () => document.getElementById('btn-export').click();
  document.getElementById('rescue-reset').onclick = () => store.reset();
}
