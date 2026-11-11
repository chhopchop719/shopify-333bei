import {Suspense, useCallback, useContext, useEffect, useRef} from 'react';
import {
  Await,
  Link,
  UNSAFE_DataRouterStateContext,
  useAsyncValue,
  useLocation,
  useNavigation,
} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import {Search, ShoppingBag, User} from 'lucide-react';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {Logo} from '~/components/Logo';
import {SearchIndex, useSearchCatalog} from '~/components/SearchIndex';
import {cn, isHomePath} from '~/lib/utils';

interface HeaderProps {
  header: HeaderQuery;
  links: MenuLink[];
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
}

/**
 * Header parts. Two ink blocks hold cells (.bar-cell in tailwind.css),
 * a hairline apart. Butter rises in a cell when it is pointed or focused and
 * fills it for the page you are on and for an open panel. 44px tall cells
 * (touch targets) on every screen.
 */
const block =
  'pointer-events-auto flex h-(--bar-block) items-stretch bg-ink text-paper print:bg-transparent print:text-ink';
const cell =
  'bar-cell flex shrink-0 items-center justify-center gap-1.5 px-3 text-[0.8125rem] font-bold whitespace-nowrap md:px-3.5';
/** Hairline before every cell but a block's first */
const divided = 'border-l border-paper/15';
const glyph = 'size-[18px]';

/**
 * Fixed header: no full-width bar, two ink blocks set on the page, the same
 * over the home photo and on every page.
 * - left: the logo (home), the menu links (md+) or "Menu" (phones)
 * - right: search, account (md+), cart with its count
 * - the search opens over it, full screen (SearchIndex)
 * - it follows the page being opened: while the page transition holds a
 *   navigation, the cell of the destination is already filled
 */
export function Header({header, links, isLoggedIn, cart}: HeaderProps) {
  const {shop} = header;
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const {pathname} = useLocation();
  const destination = useDestination();
  const isHome = isHomePath(pathname);
  const {type, open, closeIf} = useAside();
  const searchOpen = type === 'search';

  // SearchIndex puts focus back on the toggle itself, once the bar is no
  // longer inert under it
  const closeSearch = useCallback(() => closeIf('search'), [closeIf]);
  // The panel's catalogue starts loading as soon as the button is pointed
  const {preload: preloadSearch} = useSearchCatalog();

  // Leaving for another page (back button, a link in the page): the search
  // folds as the transition starts, not once the new page is in
  useEffect(() => {
    if (destination !== pathname) closeSearch();
  }, [destination, pathname, closeSearch]);

  return (
    <>
      {/* The header box lets clicks through: only the blocks catch them */}
      <header
        data-site-header
        className="site-gutter pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-3 pt-(--bar-top) transition-opacity duration-300 ease-out print:absolute"
      >
        <a
          href="#contenu"
          className="skip-link pointer-events-auto"
          onClick={skipToContent}
        >
          Aller au contenu
        </a>
        <div className={block}>
          <Link
            prefetch="intent"
            to="/"
            aria-label={`${shop.name} — accueil`}
            className="grid shrink-0 place-items-center px-3 focus-visible:outline-butter focus-visible:-outline-offset-4"
          >
            <Logo className="h-[22px] w-auto md:h-6" />
          </Link>
          <DesktopNav links={links} destination={destination} />
          <MenuToggle />
        </div>
        <div className={cn(block, 'print:invisible')}>
          <button
            ref={searchToggleRef}
            type="button"
            className={cn(cell, 'min-w-11')}
            onClick={(event) =>
              searchOpen ? closeSearch() : open('search', event.currentTarget)
            }
            onPointerEnter={preloadSearch}
            onFocus={preloadSearch}
            aria-label="Rechercher"
            aria-expanded={searchOpen}
            aria-controls="header-search"
          >
            <Search aria-hidden className={glyph} strokeWidth={1.75} />
          </button>
          <AccountLink isLoggedIn={isLoggedIn} />
          <CartToggle cart={cart} />
        </div>
      </header>
      {/* Outside <header>: the panel covers the page and the header */}
      <SearchIndex
        open={searchOpen}
        onClose={closeSearch}
        toggleRef={searchToggleRef}
      />
      {/* Pages other than home start below the header's band */}
      {!isHome && <div aria-hidden className="h-(--header-h)" />}
    </>
  );
}

/** Skip link: lands keyboard users on the page content, without a scroll jump. */
function skipToContent(event: React.MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById('contenu');
  if (!main) return;
  event.preventDefault();
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  main.focus({preventScroll: true});
}

/**
 * Pathname of the page being shown or opened. PageCurtain holds every
 * navigation (useBlocker) until the old page is covered, then the new page's
 * data loads: useLocation() only changes after both. The blocker's location
 * comes from the router state (a router allows a single useBlocker, which is
 * PageCurtain's), then useNavigation() takes over until the page commits.
 */
function useDestination() {
  const {pathname} = useLocation();
  const navigation = useNavigation();
  const routerState = useContext(UNSAFE_DataRouterStateContext);
  let held: string | undefined;
  routerState?.blockers?.forEach((blocker) => {
    if (blocker.location) held = blocker.location.pathname;
  });
  return held ?? navigation.location?.pathname ?? pathname;
}

export type MenuLink = {id: string; title: string; url: string};

/** Used when the Shopify "main-menu" is missing: the store's real routes. */
const FALLBACK_LINKS: MenuLink[] = [
  {id: 'fallback-catalogue', title: 'Catalogue', url: '/collections/all'},
  {id: 'fallback-contact', title: 'Contact', url: '/pages/contact'},
];

/**
 * The header links, one list for the desktop bar and the mobile sheet. Titles
 * come from the Shopify menu as they are; internal URLs are reduced to
 * path + query + hash.
 */
export function headerLinks(
  header: HeaderQuery,
  publicStoreDomain: string,
): MenuLink[] {
  const primaryDomainUrl = header.shop.primaryDomain.url;
  const links = (header.menu?.items ?? []).flatMap((item) =>
    item.url
      ? [
          {
            id: item.id,
            title: item.title,
            url: localUrl(item.url, primaryDomainUrl, publicStoreDomain),
          },
        ]
      : [],
  );
  return links.length ? links : FALLBACK_LINKS;
}

function localUrl(
  url: string,
  primaryDomainUrl: string,
  publicStoreDomain: string,
) {
  try {
    const target = new URL(url, primaryDomainUrl);
    const bare = (host: string) => host.replace(/^www\./, '');
    const own = [new URL(primaryDomainUrl).hostname, publicStoreDomain]
      .filter(Boolean)
      .map(bare);
    const internal =
      target.hostname.endsWith('.myshopify.com') ||
      own.includes(bare(target.hostname));
    return internal ? `${target.pathname}${target.search}${target.hash}` : url;
  } catch {
    return url;
  }
}

const normalize = (path: string) =>
  path.split(/[?#]/)[0].toLowerCase().replace(/\/+$/, '') || '/';

/**
 * The link that stands for `pathname`: its own page (aria-current="page"), or
 * the catalogue for any collection or product page (aria-current="true").
 */
function linkFor(links: MenuLink[], pathname: string) {
  const path = normalize(pathname);
  const own = links.find((link) => normalize(link.url) === path);
  if (own) return {id: own.id, exact: true};
  if (/^\/(collections|products)(\/|$)/.test(path)) {
    const catalogue = links.find((link) =>
      /^\/collections(\/all)?$/.test(normalize(link.url)),
    );
    if (catalogue) return {id: catalogue.id, exact: false};
  }
  return null;
}

/**
 * Desktop links, cells of the left block. The cell of the page you are on (or
 * being taken to) is filled butter; the others fill as they are pointed.
 */
function DesktopNav({
  links,
  destination,
}: {
  links: MenuLink[];
  destination: string;
}) {
  const {pathname} = useLocation();
  const shown = linkFor(links, pathname); // aria-current: the page on screen
  const resting = linkFor(links, destination)?.id; // filled: where you are going

  return (
    <nav aria-label="Menu principal" className="hidden md:flex print:invisible">
      <ul className="flex">
        {links.map((link) => (
          <li key={link.id} className="mb-0 flex">
            <Link
              prefetch="intent"
              to={link.url}
              aria-current={
                shown?.id === link.id
                  ? shown.exact
                    ? 'page'
                    : 'true'
                  : undefined
              }
              data-active={resting === link.id || undefined}
              className={cn(cell, divided)}
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Mobile sheet: the menu words as hairline rows (the current one on butter),
 * the account link at the bottom.
 */
export function MobileNav({
  links,
  isLoggedIn,
}: {
  links: MenuLink[];
  isLoggedIn: Promise<boolean>;
}) {
  const {close} = useAside();
  const {pathname} = useLocation();
  const shown = linkFor(links, pathname);
  const onAccount = /^\/account(\/|$)/.test(pathname);
  return (
    <nav aria-label="Menu principal" className="flex min-h-full flex-col pb-4">
      <ul className="flex flex-col">
        {links.map((link, i) => {
          const current = shown?.id === link.id;
          return (
            <li
              key={link.id}
              className="mobile-nav-item mb-0 border-b border-border"
              style={{animationDelay: `${60 + i * 45}ms`}}
            >
              <Link
                prefetch="intent"
                to={link.url}
                onClick={close}
                aria-current={
                  current ? (shown.exact ? 'page' : 'true') : undefined
                }
                // Ring inside the row: the sheet's scroller would cut the top
                // of the first row's outer ring
                className="group flex min-h-16 items-center py-2 text-4xl leading-[0.9] font-extrabold tracking-tight uppercase focus-visible:outline-offset-[-2px]"
              >
                <span
                  className={cn(
                    '-mx-1.5 px-1.5 pt-1.5 pb-1 transition-colors duration-200 ease-out group-hover:bg-butter group-focus-visible:bg-butter',
                    current &&
                      'bg-butter forced-colors:underline forced-colors:decoration-2',
                  )}
                >
                  {link.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div
        className="mobile-nav-item mt-auto pt-6"
        style={{animationDelay: `${60 + links.length * 45}ms`}}
      >
        <Link
          to="/account"
          prefetch="intent"
          onClick={close}
          aria-current={onAccount ? 'page' : undefined}
          className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold"
        >
          <User aria-hidden className="size-[18px]" strokeWidth={1.75} />
          <span
            className={cn(
              '-mx-1 px-1 py-0.5 transition-colors duration-200 ease-out group-hover:bg-butter',
              onAccount && 'bg-butter',
            )}
          >
            <AccountLabel isLoggedIn={isLoggedIn} />
          </span>
        </Link>
      </div>
    </nav>
  );
}

/** "Mon compte" when logged in, "Se connecter" otherwise (or while unknown). */
function AccountLabel({isLoggedIn}: {isLoggedIn: Promise<boolean>}) {
  return (
    <Suspense fallback="Se connecter">
      <Await resolve={isLoggedIn} errorElement="Se connecter">
        {(loggedIn: boolean) => (loggedIn ? 'Mon compte' : 'Se connecter')}
      </Await>
    </Suspense>
  );
}

function AccountLink({isLoggedIn}: {isLoggedIn: Promise<boolean>}) {
  const {pathname} = useLocation();
  const here = /^\/account(\/|$)/.test(pathname);
  return (
    <Link
      prefetch="intent"
      to="/account"
      aria-current={here ? 'page' : undefined}
      data-active={here || undefined}
      className={cn(cell, divided, 'min-w-11 max-md:hidden')}
    >
      <User aria-hidden className={glyph} strokeWidth={1.75} />
      <span className="sr-only">
        <AccountLabel isLoggedIn={isLoggedIn} />
      </span>
    </Link>
  );
}

function MenuToggle() {
  const {type, open} = useAside();
  return (
    <button
      type="button"
      className={cn(cell, divided, 'md:hidden print:invisible')}
      onClick={(event) => open('mobile', event.currentTarget)}
      aria-haspopup="dialog"
      aria-expanded={type === 'mobile'}
    >
      Menu
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {pathname} = useLocation();
  const {publish, shop, cart, prevCart} = useAnalytics();
  const onCartPage = pathname === '/cart';

  return (
    <a
      href="/cart"
      aria-current={onCartPage ? 'page' : undefined}
      data-active={onCartPage || undefined}
      className={cn(cell, divided, 'min-w-11')}
      aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}
      onClick={(event) => {
        // New tab / window: let the browser follow the link
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        // Already on the cart page: no second copy of it in a sheet
        if (onCartPage) return;
        open('cart', event.currentTarget);
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      <ShoppingBag aria-hidden className={glyph} strokeWidth={1.75} />
      {count > 0 && (
        // Butter on ink, ink once the cell turns butter (.bar-count)
        <span aria-hidden className="bar-count tabular-nums">
          {count}
        </span>
      )}
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart} errorElement={<CartBadge count={0} />}>
        <CartCount />
      </Await>
    </Suspense>
  );
}

function CartCount() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}
