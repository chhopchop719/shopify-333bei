import {Suspense} from 'react';
import {Await, Form, Link} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {PAYMENT_ICONS, PaymentMark} from '~/components/PaymentIcons';
import {SocialIcon, socialIconFor} from '~/components/SocialIcons';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

const COLUMNS = [
  {
    title: 'Boutique',
    links: [
      {to: '/collections/all', label: 'Catalogue'},
      {to: '/account', label: 'Mon compte'},
    ],
  },
  {
    title: 'Aide',
    links: [
      {to: '/pages/contact', label: 'Contact'},
      {to: '/policies/shipping-policy', label: 'Livraison'},
      {to: '/policies/refund-policy', label: 'Retours'},
      {to: '/policies/terms-of-service', label: 'CGV'},
      {to: '/policies/privacy-policy', label: 'Confidentialité'},
    ],
  },
];

const linkClass =
  'text-sm font-normal underline-offset-4 decoration-[1.5px] hover:underline';

/**
 * Footer in ink with paper text; the logo's butter marks hovers.
 * Link columns (shop, help, socials from Shopify) on the left, a field that
 * carries a question to the contact page on the right; copyright and the
 * store's real payment methods along the bottom.
 */
export function Footer({footer: footerPromise, header}: FooterProps) {
  return (
    <footer className="mt-16 bg-ink text-paper md:mt-20">
      <div className="site-gutter pt-10 pb-6 md:pt-14 md:pb-8">
        {/* Side by side from lg: at tablet width the field would be squeezed
            next to the three link columns */}
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-16">
          <nav
            aria-label="Pied de page"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:gap-x-16"
          >
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="mb-3 text-xs font-normal text-paper/60">
                  {column.title}
                </h2>
                <ul className="flex flex-col gap-1.5">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        prefetch="intent"
                        className={linkClass}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {/* Instagram, TikTok… from the Shopify menu "Réseaux" (r-seaux) */}
            <Suspense>
              <Await resolve={footerPromise}>
                {(footer) =>
                  footer?.socials?.items.length ? (
                    <div>
                      <h2 className="mb-3 text-xs font-normal text-paper/60">
                        Suivre
                      </h2>
                      <ul className="flex items-center gap-2">
                        {footer.socials.items.map((item) => {
                          if (!item.url) return null;
                          const icon = socialIconFor(item.url);
                          return (
                            <li key={item.id}>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${item.title} (nouvel onglet)`}
                                className={
                                  icon
                                    ? 'grid size-11 place-items-center border-[1.5px] border-paper/35 transition-colors duration-200 hover:border-butter hover:bg-butter hover:text-ink'
                                    : linkClass
                                }
                              >
                                {icon ? (
                                  <SocialIcon d={icon} className="size-5" />
                                ) : (
                                  item.title
                                )}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null
                }
              </Await>
            </Suspense>
          </nav>

          <div className="w-full sm:max-w-[26rem]">
            <h2 className="text-xs font-normal text-paper/60">Nous écrire</h2>
            <Form
              action="/pages/contact"
              method="get"
              className="mt-2 flex items-center gap-4 border-b-[1.5px] border-paper/35 transition-colors focus-within:border-paper"
            >
              <label htmlFor="footer-question" className="sr-only">
                Votre question
              </label>
              <input
                id="footer-question"
                name="message"
                type="text"
                autoComplete="off"
                placeholder="Votre question…"
                className="h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-base font-normal text-paper outline-none placeholder:text-paper/50"
              />
              <button
                type="submit"
                className="shrink-0 text-sm font-bold transition-colors hover:text-butter"
              >
                Écrire
              </button>
            </Form>
            <p className="mt-2 text-xs font-normal text-paper/60">
              On vous emmène sur la page contact pour l’envoyer.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-paper/15 pt-5 md:mt-20">
          <p className="text-sm font-normal text-paper/65">
            © {header.shop.name} {new Date().getFullYear()}
          </p>
          <Suspense>
            <Await resolve={footerPromise}>
              {(footer) => (
                <PaymentMethods settings={footer?.shop.paymentSettings} />
              )}
            </Await>
          </Suspense>
        </div>
      </div>
    </footer>
  );
}

function PaymentMethods({
  settings,
}: {
  settings?: NonNullable<FooterQuery>['shop']['paymentSettings'];
}) {
  if (!settings) return null;
  const methods = [
    ...settings.supportedDigitalWallets,
    ...settings.acceptedCardBrands,
  ].filter((method) => PAYMENT_ICONS[method]);
  if (!methods.length) return null;

  return (
    <ul
      aria-label="Moyens de paiement acceptés"
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      {methods.map((method) => (
        <li key={method}>
          <PaymentMark icon={PAYMENT_ICONS[method]} />
        </li>
      ))}
    </ul>
  );
}
