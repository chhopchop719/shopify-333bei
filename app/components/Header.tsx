import {
  type RefObject,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import {Menu, Search, ShoppingBag, User} from 'lucide-react';
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
 * Bar controls: 44px touch targets on phones, 36px from md. Glyphs rest a step
 * back (.bar-glyph) and come to full strength when pointed or focused; butter
 * marks the one that is "here" (current page, open panel). On phones the outer
 * buttons reach the screen edge (glyphs sit on the 12px gutter): their focus
 * ring is drawn inside so no side of it falls off screen.
 */
const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center transition-colors duration-200 ease-out aria-expanded:bg-butter aria-expanded:text-ink aria-[current=page]:bg-butter aria-[current=page]:text-ink max-md:focus-visible:outline-offset-[-2px] md:size-9';
const glyph = 'bar-glyph size-[18px]';

/**
 * Fixed header.
 * - transparent over the home hero (paper words, no small logo: the hero's
 *   sticker is the logo) until the hero's bottom passes under the bar
 * - frosted (translucent paper + backdrop blur) everywhere else
 * - the search opens over it, full screen (SearchIndex)
 * - it follows the page being opened: while the page transition holds a
 *   navigation, the bar already shows the destination
 */
export function Header({header, links, isLoggedIn, cart}: HeaderProps) {
  const {shop} = header;
  const headerRef = useRef<HTMLElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const {pathname} = useLocation();
  const destination = useDestination();
  const isHome = isHomePath(pathname);
  const heroUnderBar = useHeroUnderBar(isHome, headerRef);
  const {type, open, closeIf} = useAside();
  const searchOpen = type === 'search';
  const overlay =
    isHome && isHomePath(destination) && heroUnderBar && !searchOpen;

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
      <header
        ref={headerRef}
        data-site-header
        data-overlay={overlay || undefined}
        className={cn(
          'fixed inset-x-0 top-0 z-40 grid grid-cols-[1fr_auto_1fr] grid-rows-[var(--header-h)] items-center border-b site-gutter transition-[background-color,border-color,backdrop-filter,color,opacity] duration-300 ease-out',
          'print:absolute print:border-transparent print:bg-transparent print:text-ink print:backdrop-blur-none',
          overlay
            ? 'border-transparent bg-transparent text-paper'
            : searchOpen
              ? 'border-border bg-paper/95 text-ink backdrop-blur-xl'
              : 'border-border bg-paper/70 text-ink backdrop-blur-xl backdrop-saturate-150',
        )}
      >
        <a href="#contenu" className="skip-link" onClick={skipToContent}>
          Aller au contenu
        </a>
        <div className="flex items-center print:invisible">
          {/* Burger on mobile only; desktop gets the links inline */}
          <MenuToggle />
          <DesktopNav links={links} destination={destination} />
        </div>
        {/* On the home hero the big sticker is the logo: the small one steps
            aside (and out of the tab order) until the hero has gone by */}
        <Link
          prefetch="intent"
          to="/"
          aria-label={`${shop.name} — accueil`}
          tabIndex={overlay ? -1 : undefined}
          aria-hidden={overlay || undefined}
          className={cn('block', overlay && 'pointer-events-none')}
        >
          <Logo
            className={cn(
              'h-8 w-auto transition-[opacity,translate] duration-300 ease-out md:h-10 print:translate-y-0 print:opacity-100',
              overlay && 'translate-y-1 opacity-0 motion-reduce:translate-y-0',
            )}
          />
        </Link>
        <div className="-mr-[13px] flex items-center justify-end md:-mr-[9px] md:gap-1 print:invisible">
          <AccountLink isLoggedIn={isLoggedIn} />
          <button
            ref={searchToggleRef}
            type="button"
            className={iconButton}
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
          <CartToggle cart={cart} />
        </div>
      </header>
      {/* Outside <header>: its backdrop-filter would contain a fixed child */}
      <SearchIndex
        open={searchOpen}
        onClose={closeSearch}
        toggleRef={searchToggleRef}
      />
      {/* Pages other than home start below the fixed header (bar + hairline) */}
      {!isHome && <div aria-hidden className="h-[calc(var(--header-h)+1px)]" />}
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

/**
 * True while the home hero ([data-hero]) still lies under the bar, i.e. its
 * bottom edge is below the bar's. Starts true so the server renders the
 * transparent bar on home.
 */
function useHeroUnderBar(
  active: boolean,
  headerRef: RefObject<HTMLElement | null>,
) {
  const [under, setUnder] = useState(true);
  useEffect(() => {
    if (!active) return;
    let bar = 0;
    let frame = 0;
    const measureBar = () => {
      const header = headerRef.current;
      // First grid row = the bar (the search row unfolds below it)
      bar = header
        ? parseFloat(getComputedStyle(header).gridTemplateRows) || 0
        : 0;
    };
    const update = () => {
      frame = 0;
      const hero = document.querySelector<HTMLElement>('[data-hero]');
      setUnder(Boolean(hero && hero.getBoundingClientRect().bottom > bar));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measureBar();
      onScroll();
    };
    measureBar();
    update();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      // The next visit to home starts at the top, under the hero
      setUnder(true);
    };
  }, [active, headerRef]);
  return under;
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
 * Desktop links. The page you are on (or going to) sits on a butter block;
 * the block glides under the pointed or focused link and comes back when the
 * pointer leaves. Whatever sits on the block is ink, the other words take the
 * bar's colour (paper over the hero, ink elsewhere).
 */
function DesktopNav({
  links,
  destination,
}: {
  links: MenuLink[];
  destination: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const blockRef = useRef<HTMLSpanElement>(null);
  const {pathname} = useLocation();
  const [ready, setReady] = useState(false);
  const shown = linkFor(links, pathname); // aria-current: the page on screen
  const resting = linkFor(links, destination)?.id; // the block: where you are going

  const place = useCallback((target: HTMLElement | null) => {
    const nav = navRef.current;
    const block = blockRef.current;
    if (!nav || !block) return;
    // The word on the block turns ink (set here, outside React's renders)
    nav.querySelectorAll('a[data-on]').forEach((link) => {
      if (link !== target) link.removeAttribute('data-on');
    });
    if (!target) {
      block.style.opacity = '0';
      return;
    }
    target.setAttribute('data-on', '');
    const n = nav.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    // 1px-wide block scaled to the link's box: transform only, no layout work
    const transform = `translateX(${r.left - n.left}px) scaleX(${r.width})`;
    if (block.style.opacity !== '1') {
      // Hidden: appear in place instead of gliding in from a stale position
      block.style.transition = 'none';
      block.style.transform = transform;
      void block.offsetWidth;
      block.style.transition = '';
    } else {
      block.style.transform = transform;
    }
    block.style.opacity = '1';
  }, []);

  const rest = useCallback(
    () =>
      place(
        navRef.current?.querySelector<HTMLElement>('a[data-active]') ?? null,
      ),
    [place],
  );

  useEffect(() => {
    rest();
    // First placement is instant; glide only afterwards
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [resting, rest]);

  useEffect(() => {
    window.addEventListener('resize', rest);
    void document.fonts?.ready.then(rest); // Sora changes the widths once loaded
    return () => window.removeEventListener('resize', rest);
  }, [rest]);

  return (
    <nav
      ref={navRef}
      aria-label="Menu principal"
      className="relative -ml-2 hidden md:flex"
      onPointerLeave={rest}
    >
      <span
        ref={blockRef}
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-px origin-left bg-butter opacity-0 forced-colors:hidden',
          ready && 'nav-block',
        )}
      />
      <ul className="flex items-center gap-1">
        {links.map((link) => (
          <li key={link.id} className="mb-0">
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
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') place(event.currentTarget);
              }}
              onFocus={(event) => place(event.currentTarget)}
              onBlur={rest}
              className={cn(
                'relative z-10 block px-2 py-1 text-sm font-bold whitespace-nowrap opacity-(--bar-rest) transition-[color,opacity] duration-200 ease-out hover:opacity-100 focus-visible:opacity-100 data-[active]:opacity-100 data-[on]:text-ink data-[on]:opacity-100',
                'forced-colors:aria-[current]:underline forced-colors:aria-[current]:decoration-2 forced-colors:aria-[current]:underline-offset-4',
                // Before the block is placed (server render, pre-hydration) the
                // current word carries its own butter, at the block's size
                !ready && 'data-[active]:bg-butter data-[active]:text-ink',
              )}
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
  return (
    <Link
      prefetch="intent"
      to="/account"
      aria-current={/^\/account(\/|$)/.test(pathname) ? 'page' : undefined}
      className={cn(iconButton, 'max-md:hidden')}
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
      className={cn(iconButton, '-ml-[13px] md:hidden')}
      onClick={(event) => open('mobile', event.currentTarget)}
      aria-label="Menu"
      aria-haspopup="dialog"
      aria-expanded={type === 'mobile'}
    >
      <Menu aria-hidden className={glyph} strokeWidth={1.75} />
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
      className={cn(iconButton, 'relative')}
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
        // Square count on the bag's corner; ink on orange (4.9:1)
        <span
          aria-hidden
          className="absolute top-[calc(50%-18px)] left-[calc(50%+2px)] grid h-4 min-w-4 place-items-center bg-orange px-1 text-[10px] leading-none font-bold text-ink tabular-nums"
        >
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
