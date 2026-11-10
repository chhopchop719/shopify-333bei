import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/policies._index';
import type {PoliciesQuery} from 'storefrontapi.generated';
import {LegalQuestion, LegalTitle} from '~/components/legal/LegalLayout';
import {isEmptyHtml, legalUpdated} from '~/components/legal/legalHtml';
import {POLICIES} from '~/components/legal/policies';

export const meta: Route.MetaFunction = () => {
  return [
    {title: '333bei | Informations légales'},
    {
      name: 'description',
      content:
        'Livraison, retours, conditions générales de vente et confidentialité.',
    },
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY);
  const policies = POLICIES.map((known) => {
    const body = data.shop?.[known.key]?.body;
    const written = !isEmptyHtml(body);
    return {
      handle: known.handle,
      // French site: Shopify returns titles in the storefront language (EN)
      title: known.title,
      summary: known.summary,
      written,
      updated: written ? legalUpdated(body) : null,
    };
  });
  return {policies};
}

/**
 * Index of the legal texts: one ruled row each, saying what it answers and
 * whether it's online yet, like a table of contents for the shop.
 */
export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <div className="pb-8">
      <LegalTitle>Informations légales</LegalTitle>
      {/* Ruled like the size chart: ink head rule, faint rows. The whole row
          is the link; its title takes the site's orange on hover. */}
      <ul className="border-t border-ink">
        {policies.map((policy) => (
          <li key={policy.handle} className="border-b border-ink/15">
            <Link
              prefetch="intent"
              to={`/policies/${policy.handle}`}
              className="group grid gap-y-1.5 py-5 focus-visible:-outline-offset-2 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,11rem)] md:items-baseline md:gap-x-8 md:py-7"
            >
              <h2 className="text-xl leading-tight font-extrabold tracking-tight text-balance transition-colors duration-150 group-hover:text-orange md:text-2xl">
                {policy.title}
              </h2>
              <p className="max-w-[42ch] text-sm leading-snug font-normal text-ink/70">
                {policy.summary}
              </p>
              {(!policy.written || policy.updated) && (
                <p className="text-xs font-normal text-ink/60 md:text-right">
                  {policy.updated ? (
                    <>
                      Mis à jour le{' '}
                      <time dateTime={policy.updated.iso}>
                        {policy.updated.short}
                      </time>
                    </>
                  ) : (
                    'Bientôt en ligne'
                  )}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <LegalQuestion
        lead={'Vous ne trouvez pas votre réponse\u00a0?'}
        className="mt-8"
      />
    </div>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
    body
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
    }
  }
` as const;
