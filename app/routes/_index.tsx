import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  HomeCollectionFragment,
  HomeCollectionsQuery,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {ProductRail} from '~/components/ProductRail';
import {RECOMMENDED_PRODUCT_FRAGMENT} from '~/lib/fragments';
import {Hero, type HeroContent} from '~/components/hero/Hero';

export const meta: Route.MetaFunction = () => {
  return [{title: '333bei'}];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

/**
 * Above the fold: the hero's background, as the client set it in Shopify
 * (metaobject `home_hero`, entry "accueil": photo, portrait photo for
 * phones). No photo: the bundled one.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {entry} = await context.storefront.query(HERO_QUERY);

  const image =
    entry?.image?.reference?.__typename === 'MediaImage'
      ? entry.image.reference.image
      : null;
  const imageMobile =
    entry?.imageMobile?.reference?.__typename === 'MediaImage'
      ? entry.imageMobile.reference.image
      : null;

  const hero: HeroContent = {
    image: image ?? imageMobile ?? null,
    imageMobile: image ? (imageMobile ?? null) : null,
  };

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    hero,
  };
}

/** Below the fold: collection banners + product rails, streamed. */
function loadDeferredData({context}: Route.LoaderArgs) {
  const collections = context.storefront
    .query(HOME_COLLECTIONS_QUERY)
    .catch((error: Error) => {
      console.error(error);
      return null;
    });
  return {collections};
}

export default function Homepage() {
  const {hero, collections, isShopLinked} = useLoaderData<typeof loader>();
  return (
    <>
      <Hero hero={hero} />
      {!isShopLinked && (
        <p className="site-gutter pt-4 text-center text-2xs text-muted-foreground">
          Produits de démonstration : aucune boutique n’est encore connectée (
          <code>npx shopify hydrogen link</code>).
        </p>
      )}
      <Suspense fallback={<RailSkeleton />}>
        <Await resolve={collections}>
          {(response) => <Stories response={response} />}
        </Await>
      </Suspense>
    </>
  );
}

function Stories({response}: {response: HomeCollectionsQuery | null}) {
  const stories =
    response?.collections.nodes.filter(
      (collection) => collection.products.nodes.length > 0,
    ) ?? [];
  if (stories.length) {
    return stories.map((collection, index) => (
      <CollectionStory
        key={collection.id}
        collection={collection}
        // The first collection is already the hero image
        showBanner={index > 0}
      />
    ));
  }
  // No collection published yet: one rail with the latest products
  const products = response?.products.nodes ?? [];
  return products.length ? (
    <ProductRail
      className="site-gutter"
      id="nouveautes"
      title="Nouveautés"
      href="/collections/all"
      products={products}
    />
  ) : null;
}

function CollectionStory({
  collection,
  showBanner,
}: {
  collection: HomeCollectionFragment;
  showBanner: boolean;
}) {
  const products = collection.products.nodes;
  if (!products.length) return null;
  const href = `/collections/${collection.handle}`;

  return (
    <>
      {showBanner && collection.image && (
        <Link
          to={href}
          prefetch="intent"
          className="mt-16 block aspect-[4/5] w-full overflow-hidden bg-concrete md:mt-24 md:aspect-[16/7]"
          aria-label={`Collection ${collection.title}`}
        >
          <Image
            data={collection.image}
            sizes="100vw"
            alt={collection.image.altText || collection.title}
            className="size-full object-cover"
          />
        </Link>
      )}
      <ProductRail
        className="site-gutter"
        id={`rail-${collection.handle}`}
        title={collection.title}
        href={href}
        products={products}
      />
    </>
  );
}

function RailSkeleton() {
  return (
    <div className="site-gutter mt-16 md:mt-24" aria-hidden>
      <div className="mb-7 h-8 w-48 bg-concrete" />
      <div className="rail">
        {Array.from({length: 5}, (_, i) => (
          <div key={i} className="aspect-[5/7] animate-pulse bg-concrete" />
        ))}
      </div>
    </div>
  );
}

const COLLECTION_IMAGE_FRAGMENT = `#graphql
  fragment HomeCollectionImage on Image {
    id
    url
    altText
    width
    height
  }
` as const;

const HERO_QUERY = `#graphql
  fragment HomeHeroImage on MediaImage {
    image {
      url
      width
    }
  }
  query HomeHero($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    entry: metaobject(handle: {type: "home_hero", handle: "accueil"}) {
      image: field(key: "image") {
        reference {
          __typename
          ...HomeHeroImage
        }
      }
      imageMobile: field(key: "image_mobile") {
        reference {
          __typename
          ...HomeHeroImage
        }
      }
    }
  }
` as const;

const HOME_COLLECTIONS_QUERY = `#graphql
  fragment HomeCollection on Collection {
    id
    title
    handle
    image {
      ...HomeCollectionImage
    }
    products(first: 10) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
  query HomeCollections($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...HomeCollection
      }
    }
    products(first: 12, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
  ${COLLECTION_IMAGE_FRAGMENT}
  ${RECOMMENDED_PRODUCT_FRAGMENT}
` as const;
