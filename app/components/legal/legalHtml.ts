export type TocEntry = {id: string; text: string; level: 2 | 3};

/** "Last updated" date found at the top of a Shopify text, ready to print. */
export type LegalUpdated = {
  /** YYYY-MM-DD, for <time dateTime> */
  iso: string;
  /** "30 octobre 2026" */
  long: string;
  /** "30 oct. 2026" */
  short: string;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'section';

const ENTITIES: Record<string, string> = {
  nbsp: '\u00a0',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  ndash: '–',
  mdash: '—',
};

const stripTags = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_m, dec: string) =>
      String.fromCodePoint(Number(dec)),
    )
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name] ?? m)
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();

const FR_MONTHS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
];

const UPDATED_LABEL =
  /^(?:last\s+updated|last\s+modified|updated|effective\s+date|derni[eè]re\s+mise\s+[aà]\s+jour|mis[e]?\s+[aà]\s+jour(?:\s+le)?)\s*(?:le\s+)?[:：]?\s*(.+)$/i;

/** "October 30, 2026", "30 octobre 2026" or "30/10/2026" -> UTC date. */
function parseDate(raw: string): Date | null {
  const text = raw.replace(/[.\s]+$/, '').trim();

  const fr = /^(\d{1,2})(?:er)?\s+([a-zéèêûô]+)\s+(\d{4})$/i.exec(text);
  if (fr) {
    const month = FR_MONTHS.indexOf(
      fr[2]
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
    );
    if (month >= 0) return new Date(Date.UTC(+fr[3], month, +fr[1]));
  }

  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (numeric)
    return new Date(Date.UTC(+numeric[3], +numeric[2] - 1, +numeric[1]));

  // English month names ("October 30, 2026"): the runtime's parser, read back in UTC
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  );
}

function formatUpdated(date: Date): LegalUpdated {
  const format = (month: 'long' | 'short') =>
    new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month,
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  return {
    iso: date.toISOString().slice(0, 10),
    long: format('long'),
    short: format('short'),
  };
}

/**
 * Finds a "Last updated: …" paragraph before the first heading and lifts it
 * out of the text: the page prints the date by the title instead.
 */
function liftUpdated(html: string) {
  const firstHeading = html.search(/<h[1-6][\s>]/i);
  const head = firstHeading === -1 ? html : html.slice(0, firstHeading);
  const paragraphs = head.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi);
  for (const match of paragraphs) {
    const label = UPDATED_LABEL.exec(stripTags(match[1]));
    if (!label) continue;
    const date = parseDate(label[1]);
    if (!date) continue;
    const start = match.index ?? 0;
    return {
      html: html.slice(0, start) + html.slice(start + match[0].length),
      updated: formatUpdated(date),
    };
  }
  return {html, updated: null};
}

/** Inline declarations that survive: emphasis only. */
const KEPT_STYLE = /^(?:font-weight|font-style|text-decoration(?:-line)?)$/i;

/**
 * Text pasted into the Shopify editor (Google Docs, Word) carries inline
 * colours (often pure black), sizes, line heights and zero margins that
 * would override the reading styles. Only bold / italic / underline stay.
 */
const cleanInlineStyles = (html: string) =>
  html.replace(
    /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    (_match, double?: string, single?: string) => {
      const kept = (double ?? single ?? '')
        .split(';')
        .map((declaration) => declaration.trim())
        .filter((declaration) =>
          KEPT_STYLE.test(declaration.split(':')[0]?.trim() ?? ''),
        );
      return kept.length ? ` style="${kept.join('; ')}"` : '';
    },
  );

/**
 * Gives every h2/h3 of a Shopify rich-text body a stable id and returns a
 * table of contents, plus the "last updated" date when the text states one.
 * A body's own h1 becomes an h2 (the page title is the only h1), and tables
 * get a scrolling wrapper so they keep their table semantics on phones.
 * Runs in the loader so the HTML is identical on server and client.
 */
export function prepareLegalHtml(html: string) {
  const toc: TocEntry[] = [];
  const used = new Map<string, number>();
  const lifted = liftUpdated(
    cleanInlineStyles(html).replace(/<(\/?)h1\b/gi, '<$1h2'),
  );

  const out = lifted.html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, level: string, attrs: string, inner: string) => {
      const text = stripTags(inner);
      if (!text) return _match;
      const base = slugify(text);
      const count = used.get(base) ?? 0;
      used.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      toc.push({id, text, level: level === '2' ? 2 : 3});
      const cleanAttrs = attrs.replace(/\sid="[^"]*"/i, '');
      return `<h${level}${cleanAttrs} id="${id}">${inner}</h${level}>`;
    },
  );

  const withTables = out.replace(
    /<table\b[\s\S]*?<\/table>/gi,
    (table) =>
      `<div data-table role="region" aria-label="Tableau" tabindex="0">${table}</div>`,
  );

  return {html: withTables, toc, updated: lifted.updated};
}

/** Only the "last updated" date of a text (index page). */
export const legalUpdated = (html?: string | null) =>
  html ? liftUpdated(html).updated : null;

export const isEmptyHtml = (html?: string | null) =>
  !html || stripTags(html).length === 0;
