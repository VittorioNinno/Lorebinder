export const uid = () => Math.random().toString(36).slice(2, 9);

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Testo con **grassetto**, *corsivo* e a capo. */
export const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');

export const lines = (s) => String(s ?? '').split('\n').filter((l) => l.trim());

/** Una riga = un punto elenco (il "- " iniziale è facoltativo). */
export const bullets = (s) =>
  lines(s).map((l) => '&bull; ' + inline(l.replace(/^[-•]\s*/, ''))).join('<br>');

/** 14 -> "14 (+2)" */
export const modifier = (v) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return '–';
  const m = Math.floor((n - 10) / 2);
  return `${n} (${m >= 0 ? '+' : ''}${m})`;
};

export const slug = (s) =>
  String(s || 'documento').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'documento';
