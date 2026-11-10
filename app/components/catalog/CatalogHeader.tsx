import {Link} from 'react-router';
import {RevealTitle} from '~/components/motion/RevealTitle';
import {cn} from '~/lib/utils';
import {SORT_OPTIONS, type SortValue} from './sort';

/**
 * Header of product listings: title, piece count (when the whole list is
 * known), optional description, and the sort switch.
 */
export function CatalogHeader({
  title,
  description,
  count,
  sort,
}: {
  title: string;
  description?: string | null;
  /** Number of pieces, only when every product is loaded (no next page). */
  count?: number | null;
  sort: SortValue;
}) {
  const hrefFor = (value: SortValue) => {
    // a new sort starts again from the first page
    const params = new URLSearchParams();
    if (value !== 'nouveautes') params.set('sort', value);
    const query = params.toString();
    return query ? `?${query}` : '?';
  };

  return (
    <header className="mt-8 mb-8 flex flex-col gap-6 border-b border-ink/15 pb-5 md:mt-12 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <RevealTitle className="text-4xl leading-none tracking-tight normal-case md:text-6xl">
            {title}
          </RevealTitle>
          {count != null && (
            <span className="text-sm text-ink/55">
              {count} pièce{count > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {description && (
          <p className="max-w-[56ch] text-sm font-normal text-ink/70">
            {description}
          </p>
        )}
      </div>

      <nav
        aria-label="Trier les produits"
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm"
      >
        <span className="text-ink/55">Trier</span>
        {SORT_OPTIONS.map((option) => {
          const active = sort === option.value;
          return (
            <Link
              key={option.value}
              to={hrefFor(option.value)}
              preventScrollReset
              replace
              prefetch="intent"
              aria-current={active ? 'true' : undefined}
              className={cn(
                'underline-offset-4 decoration-[1.5px]',
                active ? 'font-bold underline' : 'text-ink/65 hover:text-ink',
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

/** Shown when a listing has no product. */
export function CatalogEmpty() {
  return (
    <div className="py-16 text-center">
      <p className="text-base font-normal text-ink/70">
        Aucun produit ici pour le moment.
      </p>
      <Link
        to="/collections/all"
        prefetch="intent"
        className="mt-3 inline-block text-sm font-bold underline decoration-[1.5px] underline-offset-4 hover:text-orange"
      >
        Voir tous les produits
      </Link>
    </div>
  );
}
