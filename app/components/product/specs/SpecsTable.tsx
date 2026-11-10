import {
  Layers,
  MoveHorizontal,
  ScissorsLineDashed,
  Spool,
  Weight,
  type LucideIcon,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableRow,
} from '~/components/ui/table';
import {isEmptySpecs, type ProductSpecs} from './specs';

type Row = {icon: LucideIcon; label: string; values: string[]};

/**
 * French spacing for text typed in Shopify: a non-breaking space before
 * % : ; ! ? » so "100 % coton" never breaks between the number and its sign.
 */
function frenchSpacing(text: string) {
  return text.trim().replace(/\s+(?=[%:;!?»])/g, ' ');
}

/** Rows in reading order; missing fields are skipped. */
function specRows(specs: ProductSpecs): Row[] {
  const rows: Row[] = [];
  if (specs.material) {
    rows.push({
      icon: Spool,
      label: 'Matière',
      values: [frenchSpacing(specs.material)],
    });
  }
  if (specs.fabricWeightLabel) {
    rows.push({
      icon: Weight,
      label: 'Grammage',
      values: [specs.fabricWeightLabel],
    });
  }
  if (specs.fit) {
    // the fit is about width and volume (boxy, oversize, près du corps)
    rows.push({
      icon: MoveHorizontal,
      label: 'Coupe',
      values: [frenchSpacing(specs.fit)],
    });
  }
  if (specs.madeToOrder) {
    rows.push({
      icon: ScissorsLineDashed,
      label: 'Fabrication',
      values: ['À la demande'],
    });
  }
  if (specs.details.length) {
    rows.push({
      icon: Layers,
      label: 'Détails',
      values: specs.details.map(frenchSpacing),
    });
  }
  return rows;
}

/**
 * The product's characteristics as a two-column table, in the same family as
 * the size guide table: an ink rule on top, hairlines between rows, the label
 * (with its pictogram) small and grey on the left, the value bold on the right.
 */
export function SpecsTable({specs}: {specs: ProductSpecs}) {
  if (isEmptySpecs(specs)) return null;
  const rows = specRows(specs);

  return (
    <Table className="border-t border-ink text-sm">
      <TableCaption className="sr-only">Caractéristiques</TableCaption>
      <TableBody>
        {rows.map(({icon: Icon, label, values}) => (
          <TableRow
            key={label}
            className="border-ink/15 align-top hover:bg-transparent"
          >
            <TableHead
              scope="row"
              className="h-auto w-[9.5rem] py-3 pl-0 align-top text-xs font-bold whitespace-normal text-ink/60"
            >
              <span className="flex items-center gap-2">
                <Icon
                  aria-hidden
                  className="size-4 shrink-0"
                  strokeWidth={1.75}
                />
                {label}
              </span>
            </TableHead>
            <TableCell className="py-3 pr-0 align-top font-bold whitespace-normal">
              {values.length > 1 ? (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0 [&>li]:m-0">
                  {values.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
              ) : (
                values[0]
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
