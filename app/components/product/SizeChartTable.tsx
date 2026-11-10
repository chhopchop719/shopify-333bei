import type {SizeChart} from '~/lib/sizeChart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {cn} from '~/lib/utils';

const number = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 1});

/**
 * Measurements table (one column per size). The size currently picked on the
 * product is highlighted so its numbers are easy to read across.
 */
export function SizeChartTable({
  chart,
  selectedSize,
}: {
  chart: SizeChart;
  selectedSize?: string;
}) {
  const active = (size: string) =>
    !!selectedSize && size.toLowerCase() === selectedSize.toLowerCase();

  return (
    <div className="pt-4">
      <Table className="text-sm tabular-nums">
        <TableHeader>
          <TableRow className="border-ink hover:bg-transparent">
            <TableHead className="pl-0 text-xs font-bold text-ink/60">
              Taille
            </TableHead>
            {chart.sizes.map((size) => (
              <TableHead
                key={size}
                scope="col"
                className={cn(
                  'text-right text-xs font-bold text-ink',
                  active(size) && 'bg-butter',
                )}
                aria-current={active(size) ? 'true' : undefined}
              >
                {size}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {chart.rows.map((row) => (
            <TableRow
              key={row.label}
              className="border-ink/15 hover:bg-transparent"
            >
              <TableHead
                scope="row"
                className="pl-0 text-xs font-bold text-ink"
              >
                {row.label}
              </TableHead>
              {row.values.map((value, i) => (
                <TableCell
                  key={chart.sizes[i]}
                  className={cn(
                    'text-right font-normal',
                    active(chart.sizes[i]) && 'bg-butter font-bold',
                  )}
                >
                  {value == null ? '—' : number.format(value)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {chart.note && (
        <p className="mt-3 text-xs font-normal text-ink/60">{chart.note}</p>
      )}
    </div>
  );
}
