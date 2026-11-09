/*
 * Salvataggio del documento nel browser.
 * Usa IndexedDB (centinaia di MB disponibili) al posto di localStorage, che si ferma a circa 5 MB
 * e si riempie in fretta con le immagini incorporate. Se IndexedDB non è disponibile si torna a localStorage.
 */
const DB_NAME = 'lorebinder';
const STORE = 'documenti';

let dbPromise = null;
function openDb() {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB non disponibile'));
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloccato'));
  });
  return dbPromise;
}

function run(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const storage = {
  /** Legge il testo salvato (IndexedDB, poi eventuale vecchio salvataggio in localStorage). */
  async read(key) {
    try {
      const value = await run('readonly', (s) => s.get(key));
      if (value != null) return value;
    } catch { /* si prova con localStorage */ }
    try { return localStorage.getItem(key); } catch { return null; }
  },

  /** Scrive il testo; restituisce true se il salvataggio è riuscito. */
  async write(key, text) {
    try {
      await run('readwrite', (s) => s.put(text, key));
      // il vecchio salvataggio in localStorage non serve più e occuperebbe spazio
      try { localStorage.removeItem(key); } catch { /* ignora */ }
      return true;
    } catch {
      try { localStorage.setItem(key, text); return true; } catch { return false; }
    }
  },

  /** Chiede al browser di non cancellare i dati quando manca spazio sul disco. */
  persist() { try { navigator.storage?.persist?.(); } catch { /* ignora */ } },
};
