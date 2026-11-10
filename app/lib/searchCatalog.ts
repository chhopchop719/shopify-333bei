import type {SearchCatalogReturn} from '~/lib/search';

export type CatalogProduct = SearchCatalogReturn['products'][number];
/** [start, end) ranges of the title that match what was typed. */
export type MarkRange = [number, number];
export type CatalogMatch = {product: CatalogProduct; marks: MarkRange[]};

/**
 * Text folded for matching: no accents, lower case, and 3 read as E (the
 * brand writes T3MPLE, H3LMET: "temple" and "helmet" must find them, as must
 * "h3lmet"). Plain titles keep their length, so marks line up with them.
 */
export function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/3/g, 'e');
}

/**
 * Products whose title, type or tags hold every word typed (in any order).
 * Most words found in the title first, then a title starting with the first
 * word; otherwise the catalogue's order (newest first). Nothing typed: all.
 */
export function matchCatalog(
  products: CatalogProduct[],
  term: string,
): CatalogMatch[] {
  const words = fold(term).split(/\s+/).filter(Boolean);
  if (!words.length) return products.map((product) => ({product, marks: []}));

  const matches: Array<CatalogMatch & {score: number}> = [];
  for (const product of products) {
    const title = fold(product.title);
    const haystack = [
      title,
      fold(product.productType),
      ...product.tags.map(fold),
    ].join(' ');
    if (!words.every((word) => haystack.includes(word))) continue;

    const inTitle = words.filter((word) => title.includes(word));
    const marks =
      title.length === product.title.length
        ? merge(
            inTitle.map((word): MarkRange => {
              const start = title.indexOf(word);
              return [start, start + word.length];
            }),
          )
        : [];
    matches.push({
      product,
      marks,
      score: inTitle.length * 2 + (title.startsWith(words[0]) ? 1 : 0),
    });
  }
  // sort is stable: equal scores keep the catalogue's order
  return matches
    .sort((a, b) => b.score - a.score)
    .map(({product, marks}) => ({product, marks}));
}

function merge(ranges: MarkRange[]) {
  const merged: MarkRange[] = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** The title cut into plain and matched pieces, in order (start: offset). */
export function markPieces(text: string, marks: MarkRange[]) {
  const pieces: Array<{text: string; marked: boolean; start: number}> = [];
  let at = 0;
  for (const [start, end] of marks) {
    if (start > at) {
      pieces.push({text: text.slice(at, start), marked: false, start: at});
    }
    pieces.push({text: text.slice(start, end), marked: true, start});
    at = end;
  }
  if (at < text.length) {
    pieces.push({text: text.slice(at), marked: false, start: at});
  }
  return pieces;
}
