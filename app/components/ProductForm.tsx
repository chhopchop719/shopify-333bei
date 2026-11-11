import {Link, useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {ChevronDown} from 'lucide-react';
import {SizeChartTable} from './product/SizeChartTable';
import type {SizeChart} from '~/lib/sizeChart';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import {useAside} from './Aside';
import type {ProductFragment} from 'storefrontapi.generated';
import {cn} from '~/lib/utils';

/** Square option tile: selected = ink, unavailable = struck through. */
function optionClass({
  selected,
  available,
}: {
  selected: boolean;
  available: boolean;
}) {
  return cn(
    'inline-flex h-12 min-w-14 items-center justify-center border-[1.5px] px-3.5 text-sm font-bold uppercase transition-colors duration-150 ease-out',
    selected
      ? 'border-ink bg-ink text-paper'
      : 'border-ink/20 bg-transparent text-ink [@media(hover:hover)_and_(pointer:fine)]:hover:border-ink',
    !available &&
      !selected &&
      'text-muted-foreground line-through decoration-1',
    !available && selected && 'line-through decoration-1',
  );
}

export function ProductForm({
  productOptions,
  selectedVariant,
  sizeChart,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  /** Measurements (metaobject size_chart via custom.size_chart), if any. */
  sizeChart?: SizeChart | null;
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  return (
    <div className="flex flex-col gap-6">
      {productOptions.map((option) => {
        // If there is only a single value in the option values, don't display the option
        if (option.optionValues.length === 1) return null;
        const selectedValue = option.optionValues.find((v) => v.selected);
        const withChart = !!sizeChart && /taille|size/i.test(option.name);

        const fieldset = (
          <fieldset
            key={option.name}
            className="m-0 flex flex-col gap-2.5 border-0 p-0"
          >
            <legend className="mb-2.5 flex w-full items-baseline justify-between gap-4 p-0 text-xs font-bold">
              <span>
                {option.name}
                {selectedValue && (
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    — {selectedValue.name}
                  </span>
                )}
              </span>
              {withChart && (
                <CollapsibleTrigger className="group inline-flex items-center gap-1 text-xs font-bold underline decoration-[1.5px] underline-offset-4 hover:text-orange">
                  Guide des tailles
                  <ChevronDown
                    aria-hidden
                    className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                  />
                </CollapsibleTrigger>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;

                if (isDifferentProduct) {
                  // SEO: combined listing child product leads to a different url
                  return (
                    <Link
                      className={optionClass({selected, available})}
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                      aria-current={selected ? 'true' : undefined}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </Link>
                  );
                }
                // SEO: variant change is a button so bots don't index duplicates
                return (
                  <button
                    type="button"
                    className={optionClass({selected, available})}
                    key={option.name + name}
                    aria-pressed={selected}
                    aria-label={available ? name : `${name} (épuisé)`}
                    disabled={!exists}
                    onClick={() => {
                      if (!selected) {
                        void navigate(`?${variantUriQuery}`, {
                          replace: true,
                          preventScrollReset: true,
                        });
                      }
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </button>
                );
              })}
            </div>
            {withChart && (
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none">
                <SizeChartTable
                  chart={sizeChart}
                  selectedSize={selectedValue?.name}
                />
              </CollapsibleContent>
            )}
          </fieldset>
        );

        // The size picker owns the collapsible chart (trigger in the legend,
        // table under the buttons)
        return withChart ? (
          <Collapsible key={option.name} asChild>
            {fieldset}
          </Collapsible>
        ) : (
          fieldset
        );
      })}
      <AddToCartButton
        available={!!selectedVariant?.availableForSale}
        onClick={() => {
          open('cart');
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                },
              ]
            : []
        }
      />
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <span
      aria-label={name}
      className="block size-6 overflow-hidden"
      style={{backgroundColor: color || 'transparent'}}
    >
      {!!image && (
        <img src={image} alt={name} className="size-full object-cover" />
      )}
    </span>
  );
}
