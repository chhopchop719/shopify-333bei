import {Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/collections._index';
import {getPaginationVariables, Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {RevealTitle} from '~/components/motion/RevealTitle';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Collections — 333bei'}];
};

export async function loader(args: Route.LoaderArgs) {
  return await loadCriticalData(args);
}

async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  const {collections} = await context.storefront.query(COLLECTIONS_QUERY, {
    variables: paginationVariables,
  });

  // No collection published yet: the catalogue is the useful page
  const firstPage = !new URL(request.url).searchParams.has('cursor');
  if (firstPage && collections.nodes.length === 0) {
    throw redirect('/collections/all');
  }

  return {collections};
}

export default function Collections() {
  const {collections} = useLoaderData<typeof loader>();

  return (
    <div className="collections">
      <header className="mt-8 mb-8 border-b border-ink/15 pb-5 md:mt-12 md:mb-10">
        <RevealTitle className="text-4xl leading-none tracking-tight normal-case md:text-6xl">
          Collections
        </RevealTitle>
      </header>
      <PaginatedResourceSection<CollectionFragment>
        connection={collections}
        resourcesClassName="grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-3 md:gap-x-3 md:gap-y-10"
        nextLabel="Afficher plus de collections"
        previousLabel="Afficher les collections précédentes"
      >
        {({node: collection, index}) => (
          <CollectionItem
            key={collection.id}
            collection={collection}
            index={index}
          />
        )}
      </PaginatedResourceSection>
    </div>
  );
}

function CollectionItem({
  collection,
  index,
}: {
  collection: CollectionFragment;
  index: number;
}) {
  return (
    <Link
      className="group block"
      to={`/collections/${collection.handle}`}
      prefetch="intent"
    >
      <div className="aspect-[4/5] overflow-hidden bg-concrete">
        {collection.image && (
          <Image
            alt={collection.image.altText || collection.title}
            aspectRatio="4/5"
            data={collection.image}
            loading={index < 3 ? 'eager' : 'lazy'}
            sizes="(min-width: 48rem) 33vw, 50vw"
            className="size-full object-cover"
          />
        )}
      </div>
      <h2 className="mt-2.5 text-sm font-bold group-hover:text-orange">
        {collection.title}
      </h2>
    </Link>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;
