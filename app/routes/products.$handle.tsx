import {Suspense, useRef} from 'react';
import {Await, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {parseSizeChart, SIZE_CHART_FRAGMENT} from '~/lib/sizeChart';
import type {
  ProductVariantFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {ProductRail} from '~/components/ProductRail';
import {SpecsTable} from '~/components/product/specs/SpecsTable';
import {getProductSpecs} from '~/components/product/specs/specs';
import {RECOMMENDED_PRODUCT_FRAGMENT} from '~/lib/fragments';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {CURVE_OUT, gsap, useGSAP} from '~/lib/gsap';
import {RevealTitle} from '~/components/motion/RevealTitle';
import {onSiteLoaded} from '~/lib/siteLoader';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `${data?.product.title ?? ''} — 333bei`},
    {
      name: 'description',
      content:
        data?.product.seo?.description || data?.product.description || '',
    },
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/** Selected variant image first, then the rest of the product images (deduped). */
function galleryImages(
  first: ProductVariantFragment['image'] | undefined,
  rest: NonNullable<ProductVariantFragment['image']>[],
) {
  const out: NonNullable<ProductVariantFragment['image']>[] = [];
  const seen = new Set<string>();
  for (const image of [first, ...rest]) {
    if (!image) continue;
    const key = image.id ?? image.url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(image);
  }
  return out;
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: Route.LoaderArgs) {
  const handle = params.handle ?? '';
  // "Vous aimerez aussi": Shopify's related picks first, then the rest of the
  // catalogue (best sellers) so the rail is never short on a small store.
  const related = context.storefront
    .query(RELATED_PRODUCTS_QUERY, {variables: {handle}})
    .then(({recommended, products}) =>
      relatedProducts(handle, [...(recommended ?? []), ...products.nodes]),
    )
    .catch((error: Error) => {
      console.error(error);
      return [];
    });

  return {related};
}

const RELATED_LIMIT = 12;

/** Other products only, each once, in the order given. */
function relatedProducts(
  currentHandle: string,
  candidates: RecommendedProductFragment[],
) {
  const seen = new Set<string>();
  const out: RecommendedProductFragment[] = [];
  for (const product of candidates) {
    if (product.handle === currentHandle || seen.has(product.id)) continue;
    seen.add(product.id);
    out.push(product);
    if (out.length === RELATED_LIMIT) break;
  }
  return out;
}

export default function Product() {
  const {product, related} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;
  const images = galleryImages(selectedVariant?.image, product.images.nodes);
  // Measurements from the size_chart metaobject (product metafield custom.size_chart)
  const sizeChartRef = product.sizeChart?.reference;
  const sizeChart = parseSizeChart(
    sizeChartRef && 'sizes' in sizeChartRef ? sizeChartRef : null,
  );
  const pageRef = useRef<HTMLDivElement>(null);

  // One load moment: the title's letters rise (RevealTitle, like every page
  // title), then the panel settles under it.
  // (The main photo flies in from the product card via PageCurtain, so it isn't animated here.)
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const reveal = gsap.from('[data-panel-rest]', {
          autoAlpha: 0,
          y: 12,
          duration: 0.6,
          ease: CURVE_OUT,
          delay: 0.35,
          paused: true,
        });
        // After the site loader, if it's showing (right away otherwise)
        return onSiteLoaded(() => {
          reveal.play();
        });
      });
    },
    {scope: pageRef, dependencies: [product.id], revertOnUpdate: true},
  );

  return (
    <>
      <div
        ref={pageRef}
        // Photos and panel side by side from lg only: on a tablet the panel
        // would be left a 230px strip next to the gallery
        className="grid grid-cols-[minmax(0,1fr)] gap-8 pt-3 md:gap-10 md:pt-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16"
      >
        <ProductImage images={images} title={title} />

        {/* @container: the title is sized on the panel's width (cqi), so a
            long name always fits its column, whatever the screen */}
        <div className="@container md:max-w-[36rem] lg:sticky lg:top-[calc(var(--header-h)+1.25rem)] lg:self-start lg:pb-10">
          <RevealTitle className="text-[clamp(2rem,13cqi,4rem)] leading-[0.92] font-extrabold tracking-tight uppercase text-balance">
            {title}
          </RevealTitle>

          <div data-panel-rest className="mt-5 flex flex-col gap-8">
            <ProductPrice
              size="lg"
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
            />
            <ProductForm
              productOptions={productOptions}
              selectedVariant={selectedVariant}
              sizeChart={sizeChart}
            />
            {descriptionHtml ? (
              <div
                className="max-w-[60ch] text-sm leading-relaxed font-normal [&_a]:underline [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p:not(:last-child)]:mb-3 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{__html: descriptionHtml}}
              />
            ) : null}
            <SpecsTable specs={getProductSpecs(product)} />
          </div>
        </div>
        <Analytics.ProductView
          data={{
            products: [
              {
                id: product.id,
                title: product.title,
                price: selectedVariant?.price.amount || '0',
                vendor: product.vendor,
                variantId: selectedVariant?.id || '',
                variantTitle: selectedVariant?.title || '',
                quantity: 1,
              },
            ],
          }}
        />
      </div>
      <Suspense fallback={null}>
        <Await resolve={related} errorElement={null}>
          {(products) =>
            products.length ? (
              <ProductRail
                // a fresh carousel (scrolled to the start) for each product
                key={product.id}
                id="vous-aimerez-aussi"
                title="Vous aimerez aussi"
                href="/collections/all"
                products={products}
              />
            ) : null
          }
        </Await>
      </Suspense>
    </>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    images(first: 10) {
      nodes {
        __typename
        id
        url
        altText
        width
        height
      }
    }
    material: metafield(namespace: "custom", key: "material") {
      value
    }
    fabricWeight: metafield(namespace: "custom", key: "fabric_weight") {
      value
    }
    fit: metafield(namespace: "custom", key: "fit") {
      value
    }
    madeToOrder: metafield(namespace: "custom", key: "made_to_order") {
      value
    }
    details: metafield(namespace: "custom", key: "details") {
      value
    }
    sizeChart: metafield(namespace: "custom", key: "size_chart") {
      reference {
        ... on Metaobject {
          ...SizeChartFields
        }
      }
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
  ${SIZE_CHART_FRAGMENT}
` as const;

const RELATED_PRODUCTS_QUERY = `#graphql
  query RelatedProducts(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    recommended: productRecommendations(productHandle: $handle, intent: RELATED) {
      ...RecommendedProduct
    }
    products(first: 13, sortKey: BEST_SELLING) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
  ${RECOMMENDED_PRODUCT_FRAGMENT}
` as const;
