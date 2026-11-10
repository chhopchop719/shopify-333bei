import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {Component, useEffect, type ErrorInfo, type ReactNode} from 'react';
import {
  Link,
  Outlet,
  useLocation,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/logo.svg';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import tailwindCss from './styles/tailwind.css?url';
import {PageLayout} from './components/PageLayout';
import {RevealTitle} from './components/motion/RevealTitle';
import {GATE_TIMER, LOADER_DONE, LOADER_GATE} from '~/lib/siteLoader';
import {cn, isHomePath} from '~/lib/utils';

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'preconnect', href: 'https://api.fontshare.com'},
    {
      rel: 'preconnect',
      href: 'https://cdn.fontshare.com',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'stylesheet',
      href: 'https://api.fontshare.com/v2/css?f[]=sora@400,500,600,700,800&display=swap',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

/** Title of the error page; every page sets its own otherwise. */
export const meta: Route.MetaFunction = ({error}) => {
  if (!error) return [];
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return [
    {
      title: notFound
        ? 'Page introuvable — 333bei'
        : 'Une erreur est survenue — 333bei',
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {header};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  return {
    // A failed cart query must not take the layout down (the header's cart
    // count and the cart panel await it): it reads as an empty cart instead
    cart: cart.get().catch((error: Error) => {
      console.error(error);
      return null;
    }),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

/**
 * Whether the site loader is already done in this tab. Entering or leaving the
 * error state makes React recreate the whole document (<html> included), which
 * would drop the `data-loaded` set by SiteLoader and replay the loader: the new
 * <html> is rendered with it instead. Read from the old <html>, at render time.
 */
function siteLoaded() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.hasAttribute('data-loaded')
  );
}

/**
 * Header, footer, cart and page transition (PageLayout) wrap the page AND the
 * route errors: both render here, in the one PageLayout. Root data is only
 * missing when the root loader itself failed; the error then renders bare.
 */
export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  const {key} = useLocation();

  return (
    // suppressHydrationWarning: the loader gate may add data-loaded before hydration
    <html
      lang="fr"
      suppressHydrationWarning
      data-loaded={siteLoaded() ? '' : undefined}
    >
      <head>
        <meta charSet="utf-8" />
        {/* Site loader gate, before first paint (see ~/lib/siteLoader) */}
        <script nonce={nonce} dangerouslySetInnerHTML={{__html: LOADER_GATE}} />
        {/* No JavaScript (and no support for the scripting media query): no loader */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: '<style>.site-loader{display:none}</style>',
          }}
        />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {data ? (
          <LayoutFallback content={children} resetKey={key}>
            <Analytics.Provider
              cart={data.cart}
              shop={data.shop}
              consent={data.consent}
            >
              <PageLayout {...data}>{children}</PageLayout>
            </Analytics.Provider>
          </LayoutFallback>
        ) : (
          children
        )}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * Route errors (404s included), shown inside the site layout: title, one
 * sentence, a way back to the shop. The raw message only shows in development.
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const data = useRouteLoaderData<RootLoader>('root');
  const {pathname} = useLocation();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const notFound = status === 404;
  const detail = import.meta.env.DEV ? errorDetail(error) : null;

  const content = (
    <section
      className={cn(
        'pb-24 md:pb-32',
        // home is full-bleed under a header without spacer: put both back
        // (same height as the header's spacer: bar + hairline)
        Boolean(data) &&
          isHomePath(pathname) &&
          'site-gutter pt-[calc(var(--header-h)+1px)]',
      )}
    >
      <RevealTitle className="mt-8 mb-6 text-4xl leading-none tracking-tight normal-case md:mt-12 md:text-6xl">
        {notFound ? 'Page introuvable' : 'Une erreur est survenue'}
      </RevealTitle>
      <p className="max-w-[34rem] text-lg leading-snug font-bold tracking-tight md:text-xl">
        {notFound
          ? 'Le lien est peut-être ancien, ou la pièce n’est plus en ligne.'
          : 'La page n’a pas pu s’afficher. Réessayez dans un instant.'}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2 md:mt-10">
        <Link
          to="/collections/all"
          prefetch="intent"
          className="flex h-12 items-center border-[1.5px] border-ink px-8 text-sm font-bold transition-colors duration-200 ease-(--ease-out) hover:bg-ink hover:text-paper"
        >
          Voir le catalogue
        </Link>
        <Link
          to="/"
          prefetch="intent"
          className="inline-flex h-12 items-center text-sm font-bold underline decoration-[1.5px] underline-offset-4 hover:text-orange"
        >
          Retour à l’accueil
        </Link>
      </div>
      {detail && (
        <pre className="mt-12 max-w-[60rem] overflow-x-auto border-t border-ink/15 pt-4 text-xs font-normal whitespace-pre-wrap text-ink/60">
          Erreur {status} : {detail}
        </pre>
      )}
    </section>
  );

  if (data) return content;
  // Root loader failed: no layout, so no SiteLoader to take over the gate
  return (
    <main className="site-gutter">
      {content}
      <ReleaseSiteLoader />
    </main>
  );
}

function errorDetail(error: unknown) {
  if (isRouteErrorResponse(error)) {
    const data: unknown = error.data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object' && 'message' in data) {
      return String(data.message);
    }
    return error.statusText;
  }
  return error instanceof Error ? error.message : null;
}

/**
 * Without PageLayout there's no SiteLoader: end the <head> gate's wait now
 * (scroll unlocked, page titles reveal) instead of after its 6 s fallback.
 */
function ReleaseSiteLoader() {
  useEffect(() => {
    const html = document.documentElement;
    window.clearTimeout(
      (window as unknown as Record<string, number | undefined>)[GATE_TIMER],
    );
    if (html.hasAttribute('data-loaded')) return;
    html.setAttribute('data-loaded', '');
    window.dispatchEvent(new Event(LOADER_DONE));
  }, []);
  return null;
}

/**
 * Safety net now that the layout also wraps the error boundary: if the layout
 * itself throws while rendering (header, cart…), show the page or error
 * content without it instead of a blank document. Retried on the next
 * navigation. (A crash in the content alone fails again here and goes up to
 * the route ErrorBoundary as before.)
 */
class LayoutFallback extends Component<
  {children: ReactNode; content: ReactNode; resetKey: string},
  {failed: boolean}
> {
  state = {failed: false};

  static getDerivedStateFromError() {
    return {failed: true};
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  componentDidUpdate(previous: {resetKey: string}) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({failed: false});
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="site-gutter">
        {this.props.content}
        <ReleaseSiteLoader />
      </main>
    );
  }
}
