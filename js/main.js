import { Store } from './core/Store.js';
import { DocumentRenderer } from './render/DocumentRenderer.js';
import { Preview } from './ui/Preview.js';
import { Editor } from './ui/Editor.js';
import { Toolbar } from './ui/Toolbar.js';

const store = new Store();
const preview = new Preview(document.getElementById('document'), new DocumentRenderer());
const editor = new Editor(document.getElementById('editor'), store);
new Toolbar(store);

store.subscribe((doc) => preview.render(doc));
editor.render();
preview.render(store.doc);
