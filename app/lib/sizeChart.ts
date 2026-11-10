/**
 * Size chart = Shopify metaobject `size_chart`, linked to a product through the
 * product metafield `custom.size_chart`. Each measurement field is a list of
 * numbers in the same order as the `sizes` list.
 */

/** Measurement fields of the metaobject, in display order. */
const MEASURES = [
  {key: 'length', label: 'Longueur dos'},
  {key: 'chest', label: 'Poitrine'},
  {key: 'sleeve', label: 'Longueur de manche'},
  {key: 'waist', label: 'Tour de taille'},
  {key: 'hips', label: 'Hanches'},
  {key: 'inseam', label: 'Entrejambe'},
] as const;

type FieldValue = {value?: string | null} | null | undefined;

/** Shape returned by the SIZE_CHART_FRAGMENT aliases. */
export type SizeChartReference = {
  name?: FieldValue;
  sizes?: FieldValue;
  note?: FieldValue;
} & Partial<Record<(typeof MEASURES)[number]['key'], FieldValue>>;

export type SizeChart = {
  name: string;
  sizes: string[];
  rows: Array<{label: string; values: Array<number | null>}>;
  note: string | null;
};

function parseList(field: FieldValue): unknown[] {
  if (!field?.value) return [];
  try {
    const parsed: unknown = JSON.parse(field.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseSizeChart(
  ref: SizeChartReference | null | undefined,
): SizeChart | null {
  if (!ref) return null;
  const sizes = parseList(ref.sizes).map(String);
  if (!sizes.length) return null;

  const rows = MEASURES.flatMap(({key, label}) => {
    const list = parseList(ref[key]);
    if (!list.length) return [];
    const values = sizes.map((_, i) => {
      const n = Number(list[i]);
      return list[i] == null || Number.isNaN(n) ? null : n;
    });
    return [{label, values}];
  });
  if (!rows.length) return null;

  return {
    name: ref.name?.value ?? '',
    sizes,
    rows,
    note: ref.note?.value ?? null,
  };
}

/** Storefront fragment for the metaobject fields (aliased by key). */
export const SIZE_CHART_FRAGMENT = `#graphql
  fragment SizeChartFields on Metaobject {
    name: field(key: "name") { value }
    sizes: field(key: "sizes") { value }
    length: field(key: "length") { value }
    chest: field(key: "chest") { value }
    sleeve: field(key: "sleeve") { value }
    waist: field(key: "waist") { value }
    hips: field(key: "hips") { value }
    inseam: field(key: "inseam") { value }
    note: field(key: "note") { value }
  }
` as const;
