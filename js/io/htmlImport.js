/**
 * Importa un manuale HTML nel formato di riferimento (es. Sol-Aeterna.html) e lo converte nel documento di Lorebinder.
 * Riconosce: level-wrapper (sezioni), poi-card (luoghi), poi-sub-block (vie, elenchi, fazioni, aree),
 * npc/item/faction-inline-card (schede) e stat-block (statistiche).
 */

const ROMAN = /^[IVXLCDM]+$/;

/** HTML -> testo con **grassetto**, *corsivo* e a capo. */
function toMarkup(node) {
  let out = '';
  node.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) { out += n.textContent.replace(/\s+/g, ' '); return; }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const tag = n.tagName.toLowerCase();
    if (tag === 'br') { out += '\n'; return; }
    const inner = toMarkup(n);
    if (tag === 'strong' || tag === 'b') out += inner.trim() ? `**${inner.trim()}** ` : '';
    else if (tag === 'em' || tag === 'i') out += inner.trim() ? `*${inner.trim()}* ` : '';
    else out += inner;
  });
  return out;
}

const clean = (s) => s
  .replace(/[ \t]+/g, ' ')
  .replace(/ ?\n ?/g, '\n')
  .replace(/\*\* ([:.,;)])/g, '**$1')
  .replace(/\* ([:.,;)])/g, '*$1')
  .replace(/\n{2,}/g, '\n')
  .trim();

const md = (el) => (el ? clean(toMarkup(el)) : '');
const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

/** "Nome (Sottotitolo)" -> [nome, sottotitolo] (le parentesi interne restano nel nome). */
function splitHeader(h) {
  const m = h.match(/^(.*?)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/);
  return m ? [m[1].trim(), m[2].trim()] : [h.trim(), ''];
}

/**
 * Immagine di una scheda: gli URL web e i data URI si usano così come sono; i percorsi locali
 * (es. C:\\Users\\...\\Kip Scurry.jpg) vengono conservati in "imgPath" e collegati poi con "Collega immagini".
 */
function imgFields(img) {
  const src = img?.getAttribute('src') || '';
  if (!src) return {};
  return /^(data:|https?:)/i.test(src) ? { img: src } : { img: '', imgPath: src };
}

/** Campi di una scheda: etichetta (testo del primo <strong>) -> valore. */
function cardFields(card) {
  const out = [];
  card.querySelectorAll(':scope > .card-field').forEach((f) => {
    const label = f.querySelector('strong');
    const lab = label ? text(label).replace(/:$/, '') : '';
    const clone = f.cloneNode(true);
    clone.querySelector('strong')?.remove();
    out.push([lab, md(clone)]);
  });
  return out;
}

const pick = (fields, ...keys) => fields.find(([l]) => keys.some((k) => l.toLowerCase().startsWith(k.toLowerCase())))?.[1] ?? '';

function npc(card) {
  const [nome, sub] = splitHeader(text(card.querySelector('.npc-name')));
  const [razza, ...ruolo] = sub.split(' — ');
  const f = cardFields(card);
  return { type: 'png', data: {
    nome, razza: razza ?? '', ruolo: ruolo.join(' — '), ...imgFields(card.querySelector('img')),
    aspetto: pick(f, 'Aspetto'), segni: pick(f, 'Segni'), psi: pick(f, 'Psicologia'),
    arg: pick(f, 'Argomenti'), segr: pick(f, 'Segreti'),
  } };
}

function item(card) {
  const [nome, sub] = splitHeader(text(card.querySelector('.item-name')));
  const f = cardFields(card);
  // eventuali elenchi puntati dopo i campi (es. modalità per ottenerlo)
  const extra = [...card.children].filter((c) => !c.classList.contains('card-field') && !c.classList.contains('item-name')
    && !c.classList.contains('item-portrait-box')).map(md).filter(Boolean).join('\n');
  const coll = [pick(f, 'Collocazione'), extra].filter(Boolean).join('\n');
  return { type: 'oggetto', data: {
    nome, sub, ...imgFields(card.querySelector('img')),
    natura: pick(f, 'Natura'), prop: pick(f, 'Propriet'), coll,
  } };
}

function faction(card) {
  const [nome, sub] = splitHeader(text(card.querySelector('.faction-name')));
  const f = cardFields(card);
  const slot = (l) => {
    const s = l.toLowerCase();
    if (s.startsWith('emblema') || s.startsWith('segnale')) return 0;
    if (s.startsWith('ruolo') || s.startsWith('attivit')) return 1;
    if (s.startsWith('segni')) return 2;
    return 3;
  };
  const vals = ['', '', '', ''];
  const labs = ['', '', '', ''];
  f.forEach(([l, v]) => { const k = slot(l); vals[k] = v; labs[k] = l; });
  return { type: 'fazione', data: {
    nome, sub, ...imgFields(card.querySelector('img')),
    emb: vals[0], ruolo: vals[1], segni: vals[2], rapp: vals[3], lab: labs.join(' | '),
  } };
}

function stat(block) {
  const d = { nome: text(block.querySelector('.stat-name')), tipo: text(block.querySelector('.stat-type')) };
  const map = { 'Classe Armatura': 'ca', 'Punti Ferita': 'pf', 'Velocità': 'vel', 'Abilità': 'abil', 'Sensi': 'sensi', 'Linguaggi': 'ling', 'Sfida': 'sfida' };
  let section = '';
  const tratti = [];
  const azioni = [];
  [...block.children].forEach((c) => {
    if (c.classList.contains('stat-section-title')) { section = text(c).toLowerCase(); return; }
    if (c.tagName === 'TABLE') {
      d.car = [...c.querySelectorAll('tbody td')].map((td) => parseInt(td.textContent, 10)).join(',');
      return;
    }
    if (!c.classList.contains('stat-line')) return;
    const label = text(c.querySelector('strong')).replace(/:$/, '');
    if (!section && map[label]) {
      const clone = c.cloneNode(true);
      clone.querySelector('strong')?.remove();
      d[map[label]] = md(clone);
      return;
    }
    (section.startsWith('azion') ? azioni : tratti).push(md(c));
  });
  d.tratti = tratti.join('\n');
  d.azioni = azioni.join('\n');
  return { type: 'mostro', data: d };
}

/** Contenuto di un sotto-blocco: bullet testuali e schede annidate, nell'ordine in cui compaiono. */
function walkSub(sub, kind, blocks) {
  const settorePending = { v: '' };

  const handleCard = (el) => {
    if (el.classList.contains('npc-inline-card')) blocks.push(npc(el));
    else if (el.classList.contains('item-inline-card')) blocks.push(item(el));
    else if (el.classList.contains('faction-inline-card')) blocks.push(faction(el));
    else if (el.classList.contains('stat-block')) blocks.push(stat(el));
    else return false;
    return true;
  };

  // testo libero (bullet separati da <br>) fuori dalle schede
  const lines = [];
  const walker = (el) => {
    [...el.childNodes].forEach((n) => {
      if (n.nodeType === Node.ELEMENT_NODE) {
        if (n.classList.contains('poi-sub-block-title')) return;
        if (handleCard(n)) return;
        const style = (n.getAttribute('style') || '').toLowerCase();
        if (style.includes('uppercase')) { settorePending.v = text(n); return; }
        if (kind === 'area' && n.tagName === 'DIV' && style.includes('margin-bottom: 12px')) {
          // contenitore di sotto-area: primo div = descrizione, poi le schede
          const [first, ...rest] = [...n.children];
          const t = md(first).replace(/^•\s*/, '');
          const m = t.match(/^\*\*(.+?):\*\*\s*([\s\S]*)$/);
          const area = { type: 'area', data: { titolo: m ? m[1] : t.slice(0, 60), descr: m ? m[2] : t } };
          if (settorePending.v) { area.data.settore = settorePending.v; settorePending.v = ''; }
          blocks.push(area);
          rest.forEach((r) => handleCard(r) || walker(r));
          return;
        }
        if (n.tagName === 'DIV') { walker(n); return; }
      }
      lines.push(n.nodeType === Node.TEXT_NODE ? n.textContent : n.outerHTML);
    });
  };
  walker(sub);
  const tmp = document.createElement('div');
  tmp.innerHTML = lines.join('');
  return md(tmp).split('\n').map((l) => l.replace(/^•\s*/, '').trim()).filter(Boolean).join('\n');
}

function poi(card) {
  const titleRaw = text(card.querySelector('.poi-title'));
  const m = titleRaw.match(/^(\d+[A-Za-z.]*)\.\s+(.*)$/);
  const luogo = { type: 'luogo', data: {
    titolo: m ? m[2] : titleRaw, num: m ? '' : '-',
    ...imgFields(card.querySelector('.env-asset-box img')),
    lettura: md(card.querySelector('.read-aloud')),
  } };
  // specifiche: <strong>Etichetta:</strong> valore separati da |
  const specsEl = card.querySelector('.poi-specs');
  if (specsEl) {
    const known = { 'Orari': 'orari', 'Permessi': 'permessi', 'Sorveglianza & Rischi': 'sorv', 'Pericoli Ambientali': 'pericoli' };
    const extra = [];
    md(specsEl).split(/\s*\|\s*(?=\*\*)/).forEach((part) => {
      const mm = part.match(/^\*\*(.+?):\*\*\s*([\s\S]*)$/);
      if (!mm) return;
      const key = known[mm[1]];
      if (key) luogo.data[key] = mm[2].trim(); else extra.push(`${mm[1]}: ${mm[2].trim()}`);
    });
    luogo.data.specs = extra.join('\n');
  }
  const blocks = [luogo];
  card.querySelectorAll(':scope > .poi-sub-block').forEach((sub, idx) => {
    const title = text(sub.querySelector('.poi-sub-block-title')).replace(/:$/, '');
    const hasFactions = sub.querySelector(':scope > .faction-inline-card');
    const hasAreas = /aree|botteghe|settori/i.test(title) || sub.querySelector(':scope > div[style*="margin-bottom: 12px"]');
    if (hasFactions) {
      luogo.data.titFazioni = title;
      walkSub(sub, 'fazione', blocks);
    } else if (hasAreas) {
      luogo.data.titAree = title;
      walkSub(sub, 'area', blocks);
    } else if (idx === 0 && /^vie d/i.test(title)) {
      luogo.data.titVie = title;
      const nested = [];
      luogo.data.vie = walkSub(sub, 'vie', nested);
      blocks.push(...nested);
    } else {
      const nested = [];
      const righe = walkSub(sub, 'elenco', nested);
      blocks.push({ type: 'elenco', data: { titolo: title, righe } }, ...nested);
    }
  });
  return blocks;
}

function sectionTitle(wrapper, index) {
  let n = wrapper.previousSibling;
  while (n && n.nodeType !== Node.ELEMENT_NODE) {
    if (n.nodeType === Node.COMMENT_NODE) {
      const t = n.textContent.replace(/=+/g, '').trim();
      if (t) {
        return t.split(/\s+/).map((w) => (ROMAN.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ');
      }
    }
    n = n.previousSibling;
  }
  return `Sezione ${index + 1}`;
}

export function importHtml(source) {
  const dom = new DOMParser().parseFromString(source, 'text/html');
  const wrappers = [...dom.querySelectorAll('.level-wrapper')];
  const roots = wrappers.length ? wrappers : [dom.body];
  const sections = roots.map((w, i) => ({
    title: wrappers.length ? sectionTitle(w, i) : 'Documento importato',
    blocks: [...w.querySelectorAll('.poi-card')].flatMap(poi),
  }));
  if (!sections.some((s) => s.blocks.length)) throw new Error('nessuna scheda "poi-card" trovata');
  const title = text(dom.querySelector('title'));
  return { title, subtitle: '', toc: false, sections, sourceTitle: title };
}

/** Collega le immagini indicate con percorsi locali ai file di una cartella scelta dall'utente. */
export async function linkImages(doc, files, resize) {
  const byPath = new Map();
  [...files].forEach((f) => byPath.set((f.webkitRelativePath || f.name).replace(/\\/g, '/').toLowerCase(), f));
  const find = (src) => {
    const p = src.replace(/\\/g, '/').toLowerCase();
    let best = null;
    let bestLen = 0;
    byPath.forEach((f, rel) => {
      // confronto sul suffisso di percorso più lungo in comune
      const a = p.split('/').reverse();
      const b = rel.split('/').reverse();
      let k = 0;
      while (k < a.length && k < b.length && a[k] === b[k]) k++;
      if (k > bestLen) { bestLen = k; best = f; }
    });
    return best;
  };
  let linked = 0;
  for (const s of doc.sections) {
    for (const b of s.blocks) {
      const src = b.data?.imgPath;
      if (!src || b.data.img) continue;
      const f = find(src);
      if (f) { b.data.img = await resize(f, b.type === 'luogo' ? 1000 : 480, 0.78); linked++; }
    }
  }
  return linked;
}
