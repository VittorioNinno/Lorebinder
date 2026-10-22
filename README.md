# Lorebinder

Editor web per scrivere note di sessione e Lore di D&D e di esportarle in PDF con un'impaginazione da manuale: schede dei luoghi, PNG, oggetti, fazioni, mostri, tabelle e diario di sessione.
Nessun backend e nessuna dipendenza: HTML, CSS e JavaScript (moduli ES). I dati restano nel browser (localStorage) e si possono esportare/importare in JSON.

## Funzionalità

- Documento organizzato in sezioni (capitoli, livelli, sessioni) con blocchi riordinabili e duplicabili
- Otto tipi di blocco: Luogo, PNG, Oggetto, Fazione, Mostro, Tabella, Diario di Sessione, Nota
- Anteprima in tempo reale con lo stesso layout usato per il PDF
- Immagini per luoghi, PNG, oggetti e fazioni (ridimensionate automaticamente)
- Indice automatico facoltativo e numerazione di pagina nel PDF
- Modificatori delle caratteristiche calcolati in automatico nelle schede mostro
- Salvataggio automatico, backup e importazione in JSON, tema chiaro/scuro

## Avvio

**Senza server:** apri `standalone.html` con doppio clic. E' una versione a file unico (CSS e JavaScript inclusi) e funziona anche offline, tranne i font Google che ripiegano su quelli di sistema.

**Con server (sviluppo):** il codice sorgente usa moduli ES, che il browser blocca se si apre `index.html` direttamente da disco. Avvia un server locale:

```bash
py -m http.server 8080           # Windows (oppure: python -m http.server 8080)
python3 -m http.server 8080      # macOS / Linux
npm start                        # se hai Node.js
```

Poi apri http://localhost:8080.

**Rigenerare `standalone.html`** dopo aver modificato il codice: `node tools/build-standalone.mjs` (oppure `npm run build`).

I dati si salvano nel browser: con `standalone.html` aperto da disco restano legati a quel file e a quel browser, quindi usa spesso "Esporta JSON" per i backup.

## Esportare in PDF

1. Premi "Esporta PDF" per aprire la finestra di stampa del browser.
2. Scegli "Salva come PDF", formato A4, margini predefiniti.
3. Attiva "Grafica di sfondo" per mantenere colori e sfondi della pergamena.

Il layout è ottimizzato per Chrome/Edge, che supportano anche la numerazione di pagina con `@page`.

## Sintassi dei testi

- `**grassetto**` e `*corsivo*`
- Nei campi elenco (Vie d'accesso, Aree) ogni riga diventa un punto elenco; il `- ` iniziale è facoltativo
- Nelle tabelle le colonne si separano con `|` e la prima riga è l'intestazione
- Nelle schede mostro i sei valori si scrivono separati da virgola (`13,12,14,8,10,9`)

Regola di annidamento: PNG, Oggetto, Fazione, Mostro e Tabella finiscono dentro l'ultimo Luogo che li precede. Diario di Sessione e Nota chiudono la scheda del luogo.

## Struttura del progetto

```
index.html
css/
  base.css              interfaccia dell'editor
  document.css          layout del documento e della stampa
js/
  main.js               avvio e collegamento dei componenti
  core/Store.js         stato del documento, persistenza, operazioni sulla struttura
  data/blockTypes.js    definizione dei tipi di blocco e dei loro campi
  data/sample.js        documento di esempio (testo inventato)
  render/renderers.js   un renderer HTML per ogni tipo di blocco
  render/DocumentRenderer.js  assembla sezioni, indice e schede annidate
  ui/Editor.js          pannello di modifica generato dalle definizioni
  ui/Preview.js         anteprima del documento
  ui/Toolbar.js         barra superiore: JSON, tema, PDF
  utils/format.js       escape, grassetto/corsivo, elenchi, modificatori
  utils/image.js        ridimensionamento delle immagini
.github/workflows/pages.yml   pubblicazione su GitHub Pages
tools/build-standalone.mjs    genera standalone.html (file unico senza server)
standalone.html               versione pronta all'uso, apribile con doppio clic
```

## Aggiungere un nuovo tipo di blocco

1. In `js/data/blockTypes.js` aggiungi la voce (etichetta e campi). Se deve annidarsi nei luoghi, inseriscila anche in `NESTED`.
2. In `js/render/renderers.js` aggiungi la funzione con lo stesso nome del tipo, che riceve i dati e restituisce HTML.
3. Se serve uno stile nuovo, aggiungilo in `css/document.css`.

L'editor mostra il nuovo blocco senza altre modifiche.

## Idee future

- Copertina con immagine e pagina di colophon
- Ricerca e tag tra i blocchi
- Mappe con segnaposto collegati ai luoghi
- Scheda incontro (mostri, CD, tesoro)
- Più documenti salvati nello stesso browser

### Licenza

*Codice sorgente rilasciato sotto licenza [MIT](LICENSE).*
