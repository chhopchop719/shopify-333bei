import {
  Layers,
  Ruler,
  Scissors,
  Spool,
  Weight,
  type LucideIcon,
} from 'lucide-react';

type Field = {value: string} | null | undefined;

/** Product metafields read by the product page (namespace "custom"). */
export type ProductSpecsFields = {
  material?: Field;
  fabricWeight?: Field;
  fit?: Field;
  madeToOrder?: Field;
  details?: Field;
};

/** Clean, display-ready values; a missing field is undefined / false / []. */
export type ProductSpecs = {
  /** e.g. "100 % coton" */
  material?: string;
  /** grams per m², e.g. 220 */
  fabricWeight?: number;
  /** e.g. "220 g/m²" (non-breaking space) */
  fabricWeightLabel?: string;
  /** e.g. "Boxy" */
  fit?: string;
  madeToOrder: boolean;
  /** e.g. ["Logo brodé", "Fermeture éclair sur le côté"] */
  details: string[];
};

/** Default icon per characteristic (lucide only). */
export const SPEC_ICONS: Record<
  'material' | 'fabricWeight' | 'fit' | 'madeToOrder' | 'details',
  LucideIcon
> = {
  material: Spool,
  fabricWeight: Weight,
  fit: Ruler,
  madeToOrder: Scissors,
  details: Layers,
};

const grams = new Intl.NumberFormat('fr-FR');

/** A list metafield's JSON value as clean strings ([] if missing or malformed). */
function parseList(value?: string) {
  if (!value) return [];
  try {
    const list: unknown = JSON.parse(value);
    return Array.isArray(list)
      ? list.filter(
          (item): item is string =>
            typeof item === 'string' && item.trim() !== '',
        )
      : [];
  } catch {
    return [];
  }
}

export function getProductSpecs(fields: ProductSpecsFields): ProductSpecs {
  const weight = Number(fields.fabricWeight?.value);
  const fabricWeight =
    Number.isFinite(weight) && weight > 0 ? weight : undefined;
  return {
    material: fields.material?.value.trim() || undefined,
    fabricWeight,
    fabricWeightLabel: fabricWeight
      ? `${grams.format(fabricWeight)}\u00a0g/m²`
      : undefined,
    fit: fields.fit?.value.trim() || undefined,
    madeToOrder: fields.madeToOrder?.value === 'true',
    details: parseList(fields.details?.value),
  };
}

/** True when there is nothing to show. */
export function isEmptySpecs(specs: ProductSpecs) {
  return (
    !specs.material &&
    !specs.fabricWeight &&
    !specs.fit &&
    !specs.madeToOrder &&
    specs.details.length === 0
  );
}
