// Genera standalone.html: un unico file con CSS e JavaScript inclusi, apribile con doppio clic (senza server).
// Uso: node tools/build-standalone.mjs   (oppure: npm run build)
import { readFileSync, writeFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// Ordine di dipendenza dei moduli
const order = [
  'js/utils/format.js', 'js/utils/image.js',
  'js/data/blockTypes.js', 'js/data/sample.js',
  'js/core/Store.js', 'js/io/htmlImport.js',
  'js/render/renderers.js', 'js/render/DocumentRenderer.js',
  'js/ui/Preview.js', 'js/ui/Editor.js', 'js/ui/Toolbar.js',
  'js/main.js',
];

const js = order
  .map((f) => `// --- ${f} ---\n` + read(f).replace(/^import .*$/gm, '').replace(/^export\s+/gm, ''))
  .join('\n');

let html = read('index.html');
html = html.replace(
  /<link rel="stylesheet" href="css\/base.css">\s*<link rel="stylesheet" href="css\/document.css" id="doc-css">/,
  () => `<style>\n${read('css/base.css')}\n</style>\n<style id="doc-css">\n${read('css/document.css')}\n</style>`,
);
html = html.replace(
  /<script type="module" src="js\/main.js"><\/script>/,
  () => `<script>\n(() => {\n'use strict';\n${js}\n})();\n</script>`,
);

writeFileSync(new URL('../standalone.html', import.meta.url), html);
console.log('Creato standalone.html');
