import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';
import {getDiscount} from '~/components/ProductPrice';
import {formatPrice} from '~/lib/money';
import {cn} from '~/lib/utils';

type CardProduct =
  CollectionItemFragment | ProductItemFragment | RecommendedProductFragment;

type Size = {value: string; available: boolean};

const SIZE_OPTION = /^(tailles?|sizes?|pointures?)$/i;

/**
 * Values of the product's size option, in catalogue order. A size counts as
 * available when at least one variant carrying it (any colour) is in stock.
 * Without an option named like a size, falls back to the single varying option.
 */
function getSizes(product: CardProduct): Size[] {
  if (!('variants' in product)) return [];
  const byOption = new Map<string, Map<string, boolean>>();
  for (const variant of product.variants.nodes) {
    for (const {name, value} of variant.selectedOptions) {
      const values = byOption.get(name) ?? new Map<string, boolean>();
      values.set(
        value,
        (values.get(value) ?? false) || variant.availableForSale,
      );
      byOption.set(name, values);
    }
  }
  const sizeName = [...byOption.keys()].find((name) =>
    SIZE_OPTION.test(name.trim()),
  );
  const varying = [...byOption.values()].filter((values) => values.size > 1);
  const sizes = sizeName
    ? byOption.get(sizeName)
    : varying.length === 1
      ? varying[0]
      : undefined;
  if (!sizes || sizes.size < 2) return [];
  return [...sizes].map(([value, available]) => ({value, available}));
}

/**
 * Product card.
 * - photo 5:7 on concrete; title and price sit on the photo, in paper, over an
 *   ink gradient that keeps them readable on any shot (white tees included)
 * - hover (fine pointers): the second photo fades in over the first, and the
 *   size strip rises above the title so you see what's left in stock
 */
export function ProductItem({
  product,
  loading,
  className,
}: {
  product: CardProduct;
  loading?: 'eager' | 'lazy';
  className?: string;
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  const second =
    'images' in product
      ? product.images.nodes.find((node) => node.id !== image?.id)
      : undefined;
  const soldOut =
    'availableForSale' in product && product.availableForSale === false;
  const sizes = getSizes(product);
  const price = product.priceRange.minVariantPrice;
  const compareAt =
    'compareAtPriceRange' in product
      ? product.compareAtPriceRange.minVariantPrice
      : null;
  const discount = getDiscount(price, compareAt);

  return (
    <Link
      // container: the caption's layout follows the card's width, not the
      // screen's (a card is narrow in a 3-up grid as on a phone)
      className={cn('group @container block', className)}
      prefetch="intent"
      to={variantUrl}
    >
      {/* data-card-frame: PageCurtain flies this photo to the product page */}
      <div
        data-card-frame
        className="relative aspect-[5/7] overflow-hidden bg-concrete"
      >
        {image && (
          <Image
            alt={image.altText || product.title}
            aspectRatio="5/7"
            data={image}
            loading={loading}
            sizes="(min-width: 64rem) 25vw, (min-width: 48rem) 33vw, 62vw"
            className={cn(
              'size-full object-cover',
              soldOut && 'opacity-60 grayscale-[35%]',
            )}
          />
        )}
        {second && !soldOut && (
          <Image
            alt=""
            aria-hidden
            data={second}
            // preloaded at low priority so the fade never shows a blank
            loading="eager"
            {...{fetchpriority: 'low'}}
            sizes="(min-width: 64rem) 25vw, (min-width: 48rem) 33vw, 62vw"
            className="card-swap absolute inset-0 size-full object-cover"
          />
        )}

        {soldOut ? (
          <span className="absolute top-2 left-2 bg-ink px-1.5 py-1 text-[10px] leading-none font-bold text-paper">
            Épuisé
          </span>
        ) : discount ? (
          <span className="absolute top-2 left-2 bg-orange px-1.5 py-1 text-[10px] leading-none font-bold text-paper">
            −{discount} %
          </span>
        ) : null}
        {/* Ink gradient under the text; never pure black */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink/85 via-ink/40 to-ink/0"
        />

        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 text-paper [text-shadow:0_1px_6px_rgb(23_22_21/0.45)] md:px-3.5 md:pb-3.5">
          {!soldOut && sizes.length > 0 && (
            <ul
              aria-label="Tailles"
              className="card-sizes absolute inset-x-3 bottom-full mb-2 flex flex-wrap gap-1 [text-shadow:none] md:inset-x-3.5"
            >
              {sizes.map((size) => (
                <li
                  key={size.value}
                  className={cn(
                    'min-w-8 bg-paper/90 px-1.5 py-1 text-center text-[10px] leading-none font-bold text-ink backdrop-blur-sm',
                    !size.available && 'text-ink/35 line-through',
                  )}
                >
                  {size.value}
                  {!size.available && (
                    <span className="sr-only"> (épuisé)</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {/* Narrow card: price under a title that may take two lines; from
              20rem wide (room for a full name and its price): one row */}
          <div className="flex flex-col items-start gap-1 text-lg leading-[1.05] font-extrabold tracking-tight md:text-xl @xs:flex-row @xs:items-baseline @xs:justify-between @xs:gap-3">
            <h3 className="line-clamp-2 min-w-0 @xs:line-clamp-1">
              {product.title}
            </h3>
            <p className="flex shrink-0 items-baseline gap-2 tabular-nums">
              {price && (
                <span className={cn(discount && 'text-butter')}>
                  {discount && <span className="sr-only">Prix soldé : </span>}
                  {formatPrice(price)}
                </span>
              )}
              {discount && compareAt && (
                <s className="text-base font-normal text-paper/75 decoration-[1.5px]">
                  <span className="sr-only">Prix d’origine : </span>
                  {formatPrice(compareAt)}
                </s>
              )}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
