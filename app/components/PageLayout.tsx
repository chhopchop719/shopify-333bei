import {Await, Link, useLocation} from 'react-router';
import {Suspense, useMemo} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside, useAside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {
  Header,
  headerLinks,
  MobileNav,
  type MenuLink,
} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {Logo} from '~/components/Logo';
import {cn, isHomePath} from '~/lib/utils';
import {SmoothScroll} from '~/components/motion/SmoothScroll';
import {PageCurtain} from '~/components/motion/PageCurtain';
import {SiteLoader} from '~/components/motion/SiteLoader';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  const {pathname} = useLocation();
  // Home is full-bleed; every other page sits in the centred site column
  const isHome = isHomePath(pathname);
  // One list of links for the desktop bar and the mobile sheet
  const links = useMemo(
    () => headerLinks(header, publicStoreDomain),
    [header, publicStoreDomain],
  );
  return (
    <Aside.Provider>
      <SmoothScroll />
      <PageCurtain />
      <SiteLoader isHome={isHome} />
      <CartAside cart={cart} />
      <MobileMenuAside
        links={links}
        shopName={header.shop.name}
        isLoggedIn={isLoggedIn}
      />
      <Header
        header={header}
        links={links}
        cart={cart}
        isLoggedIn={isLoggedIn}
      />
      {/* data-page: the page content, which the page transition moves */}
      <div data-page>
        {/* #contenu: target of the header's skip link */}
        <main
          id="contenu"
          className={cn('outline-none', !isHome && 'site-gutter pb-4')}
        >
          {children}
        </main>
        <Footer
          footer={footer}
          header={header}
          publicStoreDomain={publicStoreDomain}
        />
      </div>
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="cart" heading="Panier">
      <Suspense fallback={<p className="py-4">Chargement du panier…</p>}>
        <Await
          resolve={cart}
          errorElement={
            <p className="py-4">
              Le panier n’a pas pu être chargé. Rechargez la page pour
              réessayer.
            </p>
          }
        >
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

/** Always mounted, so the burger opens a menu even without the Shopify one. */
function MobileMenuAside({
  links,
  shopName,
  isLoggedIn,
}: {
  links: MenuLink[];
  shopName: string;
  isLoggedIn: PageLayoutProps['isLoggedIn'];
}) {
  const {close} = useAside();
  return (
    <Aside
      type="mobile"
      heading="Menu"
      // Same row as the bar: the logo stays where it was, × replaces ≡
      brand={
        <Link
          to="/"
          prefetch="intent"
          onClick={close}
          aria-label={`${shopName} — accueil`}
          // 44px tall touch target; the 32px mark stays centred in the row
          className="flex h-11 items-center"
        >
          <Logo className="h-8 w-auto" />
        </Link>
      }
    >
      <MobileNav links={links} isLoggedIn={isLoggedIn} />
    </Aside>
  );
}
