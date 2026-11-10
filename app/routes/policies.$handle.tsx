import {useLoaderData} from 'react-router';
import type {Route} from './+types/policies.$handle';
import {
  LegalArticle,
  LegalEmpty,
  LegalQuestion,
  LegalTitle,
} from '~/components/legal/LegalLayout';
import {isEmptyHtml, prepareLegalHtml} from '~/components/legal/legalHtml';
import {POLICIES} from '~/components/legal/policies';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `333bei | ${data?.title ?? ''}`},
    {name: 'description', content: data?.summary ?? ''},
  ];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const known = POLICIES.find((p) => p.handle === params.handle);
  if (!known) {
    throw new Response('Policy not found', {status: 404});
  }

  const data = await context.storefront.query(POLICY_CONTENT_QUERY, {
    variables: {
      privacyPolicy: known.key === 'privacyPolicy',
      shippingPolicy: known.key === 'shippingPolicy',
      termsOfService: known.key === 'termsOfService',
      refundPolicy: known.key === 'refundPolicy',
      language: context.storefront.i18n?.language,
    },
  });

  const {title, summary, about, ask} = known;
  const policy = data.shop?.[known.key];
  // A missing policy renders an honest empty state, not a 404:
  // the footer links to every policy, even those not written yet.
  if (!policy || isEmptyHtml(policy.body)) {
    return {title, summary, about, ask, html: null, toc: [], updated: null};
  }
  const {html, toc, updated} = prepareLegalHtml(policy.body);
  return {title, summary, about, ask, html, toc, updated};
}

export default function Policy() {
  const {title, about, ask, html, toc, updated} =
    useLoaderData<typeof loader>();

  return (
    <article className="pb-8">
      <LegalTitle
        eyebrowLink={{to: '/policies', label: 'Informations légales'}}
        updated={updated}
      >
        {title}
      </LegalTitle>
      {html ? (
        <LegalArticle html={html} toc={toc}>
          <LegalQuestion about={about} ask={ask} />
        </LegalArticle>
      ) : (
        <LegalEmpty about={about} ask={ask} />
      )}
    </article>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/Shop
const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }
  query Policy(
    $country: CountryCode
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $refundPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
  ) @inContext(language: $language, country: $country) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...Policy
      }
      shippingPolicy @include(if: $shippingPolicy) {
        ...Policy
      }
      termsOfService @include(if: $termsOfService) {
        ...Policy
      }
      refundPolicy @include(if: $refundPolicy) {
        ...Policy
      }
    }
  }
` as const;
