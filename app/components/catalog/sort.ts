/** Sort options shared by the catalogue and collection pages (?sort=…). */
export const SORT_OPTIONS = [
  {value: 'nouveautes', label: 'Nouveautés'},
  {value: 'prix-croissant', label: 'Prix croissant'},
  {value: 'prix-decroissant', label: 'Prix décroissant'},
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export function getSort(request: Request): SortValue {
  const value = new URL(request.url).searchParams.get('sort');
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SortValue)
    : 'nouveautes';
}

/** Storefront `products` connection sort (ProductSortKeys). */
export function productSort(sort: SortValue) {
  if (sort === 'prix-croissant')
    return {sortKey: 'PRICE', reverse: false} as const;
  if (sort === 'prix-decroissant')
    return {sortKey: 'PRICE', reverse: true} as const;
  return {sortKey: 'CREATED_AT', reverse: true} as const;
}

/** Storefront `collection.products` sort (ProductCollectionSortKeys). */
export function collectionSort(sort: SortValue) {
  if (sort === 'prix-croissant')
    return {sortKey: 'PRICE', reverse: false} as const;
  if (sort === 'prix-decroissant')
    return {sortKey: 'PRICE', reverse: true} as const;
  return {sortKey: 'CREATED', reverse: true} as const;
}
