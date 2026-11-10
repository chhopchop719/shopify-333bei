import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {formatPrice} from '~/lib/money';
import {cn} from '~/lib/utils';

type Money = Pick<MoneyV2, 'amount' | 'currencyCode'>;

/** Discount in whole percent, or null when the item isn't on sale. */
export function getDiscount(price?: Money | null, compareAt?: Money | null) {
  if (!price || !compareAt) return null;
  const now = Number(price.amount);
  const before = Number(compareAt.amount);
  if (!(before > now) || before <= 0) return null;
  const percent = Math.round((1 - now / before) * 100);
  return percent >= 1 ? percent : null;
}

/**
 * Price with sale treatment.
 * - lg (product page): big extrabold figure; on sale it turns orange, the
 *   original price is struck next to it and a "−30 %" tag says by how much
 * - sm (cart lines, cards): same logic at body size
 */
export function ProductPrice({
  price,
  compareAtPrice,
  size = 'sm',
  tag = true,
  className,
}: {
  price?: Money | null;
  compareAtPrice?: Money | null;
  size?: 'sm' | 'lg';
  /** Show the "−30 %" tag (cards put it on the photo instead). */
  tag?: boolean;
  className?: string;
}) {
  const discount = getDiscount(price, compareAtPrice);
  const large = size === 'lg';

  return (
    <div
      role="group"
      aria-label="Prix"
      className={cn(
        'flex flex-wrap items-baseline gap-x-2.5 gap-y-1',
        className,
      )}
    >
      {price ? (
        <span
          className={cn(
            'tabular-nums',
            large
              ? 'text-3xl leading-none font-extrabold tracking-tight md:text-4xl'
              : 'text-xs font-bold',
            discount && 'text-orange',
          )}
        >
          {discount && <span className="sr-only">Prix soldé : </span>}
          {formatPrice(price)}
        </span>
      ) : (
        <span>&nbsp;</span>
      )}
      {discount && compareAtPrice && (
        <>
          <s
            className={cn(
              'text-muted-foreground tabular-nums decoration-[1.5px]',
              large ? 'text-lg font-semibold' : 'text-xs',
            )}
          >
            <span className="sr-only">Prix d’origine : </span>
            {formatPrice(compareAtPrice)}
          </s>
          {tag && (
            <span
              className={cn(
                'self-center bg-orange font-bold text-paper tabular-nums',
                large
                  ? 'px-2 py-1 text-xs'
                  : 'px-1 py-0.5 text-[10px] leading-none',
              )}
            >
              −{discount} %
            </span>
          )}
        </>
      )}
    </div>
  );
}
