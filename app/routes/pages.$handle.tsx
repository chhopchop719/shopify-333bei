import {useState, type FormEvent} from 'react';
import {Link, useLoaderData, useSearchParams} from 'react-router';
import type {Route} from './+types/pages.$handle';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {
  LegalArticle,
  LegalEmpty,
  LegalTitle,
  proseClass,
} from '~/components/legal/LegalLayout';
import {isEmptyHtml, prepareLegalHtml} from '~/components/legal/legalHtml';
import {CONTACT_EMAIL} from '~/components/legal/contact';
import {LiquidButton} from '~/components/product/LiquidButton';
import {RevealTitle} from '~/components/motion/RevealTitle';
import {PackageSearch, RotateCcw, Truck} from 'lucide-react';
import {cn} from '~/lib/utils';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `333bei | ${data?.page.title ?? ''}`},
    {name: 'description', content: data?.page.seo?.description ?? ''},
  ];
};

export async function loader({context, request, params}: Route.LoaderArgs) {
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const {page} = await context.storefront.query(PAGE_QUERY, {
    variables: {handle: params.handle},
  });

  if (!page) {
    throw new Response('Not Found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});

  const prepared = isEmptyHtml(page.body) ? null : prepareLegalHtml(page.body);
  return {page, prepared};
}

export default function Page() {
  const {page, prepared} = useLoaderData<typeof loader>();

  if (page.handle === 'contact') {
    return <ContactPage bodyHtml={prepared?.html ?? null} />;
  }

  return (
    <article className="pb-8">
      <LegalTitle updated={prepared?.updated}>{page.title}</LegalTitle>
      {prepared ? (
        <LegalArticle html={prepared.html} toc={prepared.toc} />
      ) : (
        <LegalEmpty />
      )}
    </article>
  );
}

const SUBJECTS = [
  {value: 'Commande', label: 'une commande'},
  {value: 'Retour ou échange', label: 'un retour ou un échange'},
  {value: 'Produit', label: 'un produit'},
  {value: 'Autre', label: 'autre chose'},
] as const;

const HELP_LINKS = [
  {
    to: '/policies/shipping-policy',
    label: 'Livraison',
    hint: 'Délais et frais d’envoi',
    icon: Truck,
  },
  {
    to: '/policies/refund-policy',
    label: 'Retours',
    hint: 'Retourner ou échanger une pièce',
    icon: RotateCcw,
  },
  {
    to: '/account/orders',
    label: 'Suivre une commande',
    hint: 'Depuis votre compte',
    icon: PackageSearch,
  },
];

const fieldLabel = 'mb-2 block text-sm font-normal text-ink/60';
const fieldBox =
  'w-full rounded-none border-[1.5px] border-ink/20 bg-transparent font-bold outline-none transition-colors placeholder:font-normal placeholder:text-ink/45 hover:border-ink/40 focus-visible:border-ink';

/**
 * Contact. Desktop: the practical side on the left (what to expect, the
 * address, quick answers), the message on the right. Phones: the message
 * first, the rest underneath.
 * The form prepares the email in the visitor's own mail app (mailto:), so
 * their name and address travel with it: we only ask what it's about and what
 * they want to say. `?message=` (from the footer) pre-fills it.
 * TODO: to send from the site, wire a backend (Shopify Flow, a form service or
 * a transactional email API).
 */
function ContactPage({bodyHtml}: {bodyHtml: string | null}) {
  const [searchParams] = useSearchParams();
  const initialMessage = searchParams.get('message') ?? '';
  const [subject, setSubject] = useState<string>(SUBJECTS[0].value);
  const [opened, setOpened] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const order = String(form.get('order') ?? '').trim();
    const message = String(form.get('message') ?? '').trim();
    const title = `[333bei] ${subject}${order ? ` — ${order}` : ''}`;
    const body = order ? `${message}\n\nCommande : ${order}` : message;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      title,
    )}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  };

  return (
    <article className="pb-16">
      {/* Same title and letter rise as the catalogue (its sibling in the nav) */}
      <RevealTitle className="mt-8 mb-10 text-4xl leading-none tracking-tight normal-case md:mt-12 md:mb-14 md:text-6xl">
        Contact
      </RevealTitle>

      <div className="grid gap-x-16 gap-y-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-x-24">
        {/* Desktop: left column, top */}
        <p className="max-w-[26rem] text-lg leading-snug font-bold tracking-tight md:col-start-1 md:row-start-1 md:text-xl">
          Une question sur une commande, une taille ou un retour&nbsp;?
          Écrivez-nous ici, on vous répond par email.
        </p>

        {/* Desktop: right column, both rows */}
        <form
          onSubmit={onSubmit}
          className="flex max-w-[46rem] flex-col gap-8 md:col-start-2 md:row-span-2 md:row-start-1"
        >
          <fieldset className="m-0 border-0 p-0">
            <legend className={cn(fieldLabel, 'p-0')}>Ça concerne</legend>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECTS.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="subject"
                    value={option.value}
                    checked={subject === option.value}
                    onChange={() => setSubject(option.value)}
                    className="peer sr-only"
                  />
                  {/* the picked subject sits on butter, like the current page in the header */}
                  <span className="block border-[1.5px] border-ink/20 px-3.5 py-2 text-sm font-bold transition-colors duration-150 peer-checked:border-ink peer-checked:bg-butter peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-orange hover:border-ink">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {subject === 'Commande' && (
            <div>
              <label htmlFor="contact-order" className={fieldLabel}>
                Numéro de commande (facultatif)
              </label>
              <input
                id="contact-order"
                name="order"
                placeholder="#1001"
                autoComplete="off"
                className={cn(fieldBox, 'h-12 max-w-[14rem] px-3.5 text-base')}
              />
            </div>
          )}

          <div>
            <label htmlFor="contact-message" className={fieldLabel}>
              Votre message
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              rows={7}
              defaultValue={initialMessage}
              placeholder="Bonjour, …"
              className={cn(
                fieldBox,
                'block min-h-48 resize-y p-3.5 text-lg leading-snug font-medium md:p-4 md:text-xl',
              )}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-sm font-normal text-ink/60" aria-live="polite">
              {opened
                ? 'Votre messagerie s’est ouverte avec le message prêt : il ne reste qu’à l’envoyer.'
                : 'Le bouton ouvre votre messagerie avec ce message.'}
            </p>
            <LiquidButton
              type="submit"
              className="h-12 w-full shrink-0 px-8 sm:w-auto"
            >
              Écrire l’email
            </LiquidButton>
          </div>
        </form>

        {/* Desktop: left column, bottom */}
        <div className="flex flex-col gap-10 md:col-start-1 md:row-start-2">
          <div>
            <h2 className={fieldLabel}>Par email</h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-base font-bold underline decoration-[1.5px] underline-offset-4 [overflow-wrap:anywhere] hover:text-orange md:text-lg"
            >
              {CONTACT_EMAIL}
            </a>
          </div>

          <nav aria-labelledby="contact-help">
            <h2 id="contact-help" className={fieldLabel}>
              Avant d’écrire
            </h2>
            <ul className="border-t border-ink/15">
              {HELP_LINKS.map(({to, label, hint, icon: Icon}) => (
                <li key={to} className="border-b border-ink/15">
                  <Link
                    to={to}
                    prefetch="intent"
                    className="group flex items-center gap-3 py-3.5"
                  >
                    <Icon
                      aria-hidden
                      className="size-5 shrink-0"
                      strokeWidth={1.75}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-bold group-hover:text-orange">
                        {label}
                      </span>
                      <span className="text-sm font-normal text-ink/60">
                        {hint}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {bodyHtml && (
            <div
              className={proseClass}
              dangerouslySetInnerHTML={{__html: bodyHtml}}
            />
          )}
        </div>
      </div>
    </article>
  );
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;
