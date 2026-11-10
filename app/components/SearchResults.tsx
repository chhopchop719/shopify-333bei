import {useId} from 'react';
import {Link} from 'react-router';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/components/ProductItem';
import {urlWithTrackingParams, type RegularSearchReturn} from '~/lib/search';

type SearchItems = RegularSearchReturn['result']['items'];
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<
  SearchItems,
  ItemType
> &
  Pick<RegularSearchReturn, 'term'>;
type SearchProductNode = SearchItems['products']['nodes'][number];

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & {term: string}) => React.ReactNode;
};

/** The search term in French quotes, kept on one line with its quotes. */
export function quoteTerm(term: string) {
  return `«\u00a0${term}\u00a0»`;
}

const sectionLabel = 'mb-3 text-sm font-normal text-ink/60';

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, 'error' | 'type'>) {
  if (!result?.total) {
    return null;
  }

  return children({...result.items, term});
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;

/** Products as the catalogue's cards, same grid, same "show more". */
function SearchResultsProducts({
  term,
  products,
}: PartialSearchResult<'products'>) {
  const labelId = useId();
  if (!products?.nodes.length) {
    return null;
  }

  const count = products.nodes.length;
  const complete =
    !products.pageInfo.hasNextPage && !products.pageInfo.hasPreviousPage;

  return (
    <section aria-labelledby={labelId}>
      <h2 id={labelId} className={sectionLabel}>
        {complete
          ? `${count} produit${count > 1 ? 's' : ''} pour ${quoteTerm(term)}`
          : `Produits pour ${quoteTerm(term)}`}
      </h2>
      <PaginatedResourceSection<SearchProductNode>
        connection={products}
        resourcesClassName="products-grid"
        nextLabel="Afficher plus de produits"
        previousLabel="Afficher les produits précédents"
      >
        {({node: product, index}) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
          />
        )}
      </PaginatedResourceSection>
    </section>
  );
}

function SearchResultsPages({term, pages}: PartialSearchResult<'pages'>) {
  if (!pages?.nodes.length) {
    return null;
  }

  return (
    <ResultRows
      title="Pages"
      rows={pages.nodes.map((page) => ({
        id: page.id,
        title: page.title,
        to: urlWithTrackingParams({
          baseUrl: `/pages/${page.handle}`,
          trackingParams: page.trackingParameters,
          term,
        }),
      }))}
    />
  );
}

function SearchResultsArticles({
  term,
  articles,
}: PartialSearchResult<'articles'>) {
  if (!articles?.nodes.length) {
    return null;
  }

  return (
    <ResultRows
      title="Articles"
      rows={articles.nodes.map((article) => ({
        id: article.id,
        title: article.title,
        to: urlWithTrackingParams({
          baseUrl: `/blogs/${article.blog.handle}/${article.handle}`,
          trackingParams: article.trackingParameters,
          term,
        }),
      }))}
    />
  );
}

/** Pages and articles: hairline rows, like the contact page's help links. */
function ResultRows({
  title,
  rows,
}: {
  title: string;
  rows: Array<{id: string; title: string; to: string}>;
}) {
  const labelId = useId();
  return (
    <section aria-labelledby={labelId}>
      <h2 id={labelId} className={sectionLabel}>
        {title}
      </h2>
      <ul className="border-t border-ink/15">
        {rows.map((row) => (
          <li key={row.id} className="m-0 border-b border-ink/15">
            <Link
              prefetch="intent"
              to={row.to}
              className="flex min-h-12 items-center py-3 text-base font-bold hover:text-orange"
            >
              {row.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Nothing to show (no query yet, no match, or a failed search): say so, and
 * open the way to the whole catalogue.
 */
function SearchResultsEmpty({heading, text}: {heading?: string; text: string}) {
  return (
    <div className="max-w-[34rem] pt-2 pb-10">
      {heading && (
        <h2 className="text-lg leading-snug font-bold tracking-tight md:text-xl">
          {heading}
        </h2>
      )}
      <p className="mt-2 text-base font-normal text-ink/70">{text}</p>
      <Link
        to="/collections/all"
        prefetch="intent"
        className="mt-8 flex h-12 w-fit items-center border-[1.5px] border-ink px-8 text-sm font-bold transition-colors duration-200 ease-(--ease-out) hover:bg-ink hover:text-paper"
      >
        Voir tout le catalogue
      </Link>
    </div>
  );
}
