import {useEffect} from 'react';
import {
  useLoaderData,
  useNavigation,
  type ShouldRevalidateFunction,
} from 'react-router';
import type {Route} from './+types/search';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {Search} from 'lucide-react';
import {RevealTitle} from '~/components/motion/RevealTitle';
import {SearchForm} from '~/components/SearchForm';
import {SearchResults, quoteTerm} from '~/components/SearchResults';
import {
  type RegularSearchReturn,
  type PredictiveSearchReturn,
  type SearchCatalogReturn,
  getEmptyPredictiveSearchResult,
} from '~/lib/search';
import {cn} from '~/lib/utils';
import type {
  RegularSearchQuery,
  PredictiveSearchQuery,
} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Recherche — 333bei'}];
};

/**
 * Results don't depend on the cart or the session: don't run the search again
 * after every cart change (that includes the header suggestions' last query,
 * whose fetcher stays mounted). A new ?q= is a GET and still reloads.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  defaultShouldRevalidate,
}) => (formMethod && formMethod !== 'GET' ? false : defaultShouldRevalidate);

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (url.searchParams.has('catalog')) {
    // The search panel's catalogue (filtered in the browser): same rule as
    // the suggestions below, a failure means an empty list, never an error page
    try {
      return await searchCatalog({context});
    } catch (error) {
      console.error(error);
      return emptySearchCatalog(error);
    }
  }
  if (url.searchParams.has('predictive')) {
    // Header suggestions: a failed request (Storefront API error, rate
    // limit…) means no suggestions, never an error page. The header's
    // fetcher belongs to the root route, so a throw here would replace the
    // whole page with the root error boundary.
    try {
      return await predictiveSearch({request, context});
    } catch (error) {
      console.error(error);
      return emptyPredictiveSearch(url, error);
    }
  }
  return await regularSearch({request, context});
}

/**
 * Same guard on the client, for what never reaches the server loader
 * (offline, network error): the suggestions just stay empty.
 */
export async function clientLoader({
  request,
  serverLoader,
}: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const catalog = url.searchParams.has('catalog');
  if (!catalog && !url.searchParams.has('predictive')) {
    return await serverLoader();
  }
  try {
    return await serverLoader();
  } catch (error) {
    if (error instanceof Response) throw error; // redirects keep working
    // Superseded by the next keystroke: the router drops this result anyway
    if (request.signal.aborted) throw error;
    console.error(error);
    return catalog
      ? emptySearchCatalog(error)
      : emptyPredictiveSearch(url, error);
  }
}

function emptyPredictiveSearch(
  url: URL,
  error: unknown,
): PredictiveSearchReturn {
  return {
    type: 'predictive',
    term: String(url.searchParams.get('q') || '').trim(),
    result: getEmptyPredictiveSearchResult(),
    error: error instanceof Error ? error.message : String(error),
  };
}

/**
 * /search: where the header search's Enter and "Voir tous les résultats" lead.
 * The query stays in a big field under the title (refine in place); products
 * show as the catalogue's cards, pages and articles as plain rows below.
 */
export default function SearchPage() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  if (data.type === 'predictive' || data.type === 'catalog') return null;

  const {term, result, error} = data;
  const {products, pages, articles} = result.items;
  const others = pages.nodes.length + articles.nodes.length > 0;
  // A new query is loading (not "show more", which keeps the same q)
  const nextTerm =
    navigation.state === 'loading' && navigation.location.pathname === '/search'
      ? (new URLSearchParams(navigation.location.search).get('q') ?? '').trim()
      : null;
  const searching = nextTerm !== null && nextTerm !== term;

  return (
    <div className="pb-16 md:pb-24">
      <RevealTitle className="mt-8 mb-6 text-4xl leading-none tracking-tight normal-case md:mt-12 md:text-6xl">
        Recherche
      </RevealTitle>

      <SearchForm
        action="/search"
        role="search"
        aria-label="Affiner la recherche"
        className="flex max-w-[46rem] items-center gap-2 border-b-[1.5px] border-ink/20 transition-colors duration-200 ease-(--ease-out) focus-within:border-ink hover:border-ink/40"
      >
        {({inputRef}) => <SearchField inputRef={inputRef} term={term} />}
      </SearchForm>

      <div
        aria-busy={searching}
        className={cn(
          'mt-6 transition-opacity duration-200 ease-(--ease-out) md:mt-8',
          searching && 'opacity-40',
        )}
      >
        {!term ? (
          <SearchResults.Empty text="Cherchez une pièce par son nom." />
        ) : result.total === 0 ? (
          error ? (
            <SearchResults.Empty
              heading="La recherche n’a pas abouti"
              text="Réessayez dans un instant, ou parcourez le catalogue."
            />
          ) : (
            <SearchResults.Empty
              heading={`Aucun résultat pour ${quoteTerm(term)}`}
              text="Vérifiez l’orthographe ou essayez un mot plus court."
            />
          )
        ) : (
          <>
            {products.nodes.length > 0 ? (
              <SearchResults.Products products={products} term={term} />
            ) : (
              <SearchResults.Empty
                heading={`Aucun produit pour ${quoteTerm(term)}`}
                text="Vérifiez l’orthographe ou essayez un mot plus court."
              />
            )}
            {others && (
              <div className="mt-4 grid max-w-[60rem] gap-12 md:grid-cols-2">
                <SearchResults.Pages pages={pages} term={term} />
                <SearchResults.Articles articles={articles} term={term} />
              </div>
            )}
          </>
        )}
      </div>
      <Analytics.SearchView data={{searchTerm: term, searchResults: result}} />
    </div>
  );
}

/** The query field: big like the header search, kept in sync with the URL. */
function SearchField({
  inputRef,
  term,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  term: string;
}) {
  // A new search from the header while on this page updates the field
  useEffect(() => {
    const input = inputRef.current;
    if (input && input.value.trim() !== term) input.value = term;
  }, [inputRef, term]);

  return (
    <>
      <label htmlFor="search-page-input" className="sr-only">
        Rechercher un produit
      </label>
      <input
        ref={inputRef}
        id="search-page-input"
        name="q"
        type="search"
        defaultValue={term}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Rechercher un produit"
        className="m-0 block h-14 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-2xl font-extrabold tracking-tight outline-none placeholder:font-bold placeholder:text-ink/50 md:h-16 md:text-3xl [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label="Lancer la recherche"
        className="grid size-11 shrink-0 place-items-center text-ink/70 transition-colors duration-200 ease-(--ease-out) hover:text-ink"
      >
        <Search aria-hidden className="size-[18px]" strokeWidth={1.75} />
      </button>
    </>
  );
}

/**
 * Regular search query and fragments
 * (adjust as needed)
 */
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
    # what the product card (ProductItem) shows, as in the catalogue
    availableForSale
    featuredImage {
      id
      altText
      url
      width
      height
    }
    images(first: 2) {
      nodes {
        id
        altText
        url
        width
        height
      }
    }
    variants(first: 25) {
      nodes {
        availableForSale
        selectedOptions {
          name
          value
        }
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
      selectedOptions {
        name
        value
      }
      product {
        handle
        title
      }
    }
  }
` as const;

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
` as const;

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
    blog {
      handle
    }
  }
` as const;

const PAGE_INFO_FRAGMENT = `#graphql
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/search
export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    # Fixed counts: only products paginate (with "previous", $first is unset)
    articles: search(
      query: $term,
      types: [ARTICLE],
      first: 6,
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(
      query: $term,
      types: [PAGE],
      first: 6,
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: RELEVANCE,
      types: [PRODUCT],
      unavailableProducts: HIDE,
    ) {
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
  ${SEARCH_PAGE_FRAGMENT}
  ${SEARCH_ARTICLE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
` as const;

/**
 * Every product the search panel (SearchIndex) lists and filters as you type,
 * newest first. Light on purpose: one photo, the price, what the filter reads.
 */
const SEARCH_CATALOG_QUERY = `#graphql
  query SearchCatalog($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 100, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        productType
        tags
        availableForSale
        featuredImage {
          id
          url
          altText
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
` as const;

async function searchCatalog({
  context,
}: Pick<Route.LoaderArgs, 'context'>): Promise<SearchCatalogReturn> {
  const {products} = await context.storefront.query(SEARCH_CATALOG_QUERY, {
    cache: context.storefront.CacheShort(),
  });
  return {type: 'catalog', products: products.nodes};
}

function emptySearchCatalog(error: unknown): SearchCatalogReturn {
  return {
    type: 'catalog',
    products: [],
    error: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Regular search fetcher
 */
async function regularSearch({
  request,
  context,
}: Pick<
  Route.LoaderArgs,
  'request' | 'context'
>): Promise<RegularSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  // 12: full rows of 2, 3 or 4 cards, like the catalogue
  const variables = getPaginationVariables(request, {pageBy: 12});
  const term = String(url.searchParams.get('q') || '').trim();

  // Nothing typed yet: no request, the page invites a search
  if (!term) return emptyRegularSearch(term);

  // Search articles, pages, and products for the `q` term
  let response: {
    errors?: Array<{message: string}>;
  } & Partial<RegularSearchQuery>;
  try {
    response = await storefront.query(SEARCH_QUERY, {
      variables: {...variables, term},
    });
  } catch (error) {
    // Storefront API down or refusing: the page says so and keeps its field
    console.error(error);
    return emptyRegularSearch(
      term,
      error instanceof Error ? error.message : String(error),
    );
  }

  const {errors, articles, pages, products} = response;
  const error = errors
    ? errors.map(({message}: {message: string}) => message).join(', ')
    : undefined;

  // A failed query can come back without its lists (e.g. a stale or edited
  // "show more" cursor): same "search failed" state, not an error page
  if (!articles || !pages || !products) {
    if (error) console.error(error);
    return emptyRegularSearch(
      term,
      error ?? 'No search data returned from Shopify API',
    );
  }

  const items = {articles, pages, products};
  const total =
    articles.nodes.length + pages.nodes.length + products.nodes.length;

  return {type: 'regular', term, error, result: {total, items}};
}

/** No results (no query yet, or a failed search when `error` is set). */
function emptyRegularSearch(term: string, error?: string): RegularSearchReturn {
  return {
    type: 'regular',
    term,
    error,
    result: {
      total: 0,
      items: {
        articles: {nodes: []},
        pages: {nodes: []},
        products: {
          nodes: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        },
      },
    },
  };
}

/**
 * Predictive search query and fragments
 * (adjust as needed)
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
` as const;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const;

/**
 * Predictive search fetcher
 */
async function predictiveSearch({
  request,
  context,
}: Pick<
  Route.ActionArgs,
  'request' | 'context'
>): Promise<PredictiveSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  // Predictively search articles, collections, pages, products, and queries (suggestions)
  const {
    predictiveSearch: items,
    errors,
  }: PredictiveSearchQuery & {errors?: Array<{message: string}>} =
    await storefront.query(PREDICTIVE_SEARCH_QUERY, {
      variables: {
        // customize search options as needed
        limit,
        limitScope: 'EACH',
        term,
      },
    });

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}: {message: string}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc: number, item: Array<unknown>) => acc + item.length,
    0,
  );

  return {type, term, result: {items, total}};
}
