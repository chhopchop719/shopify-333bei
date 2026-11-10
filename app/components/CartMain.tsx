import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';
import {cn} from '~/lib/utils';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};
/** Returns a map of all line items and their children. */
function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const lineChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(lineChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}
/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 */
export function CartMain({layout, cart: originalCart}: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  return (
    <section
      className={cn(
        layout === 'aside' ? 'flex min-h-full flex-col' : 'pb-10',
      )}
      aria-label={layout === 'page' ? 'Panier' : 'Panier (panneau)'}
    >
      <CartEmpty hidden={linesCount} layout={layout} />
      <div
        className={cn(
          layout === 'aside'
            ? 'flex flex-1 flex-col'
            : 'grid gap-10 md:grid-cols-[minmax(0,1fr)_380px] md:items-start',
        )}
      >
        <p id="cart-lines" className="sr-only">
          Articles du panier
        </p>
        <ul aria-labelledby="cart-lines" className="flex-1 divide-y">
          {(cart?.lines?.nodes ?? []).map((line) => {
            // we do not render non-parent lines at the root of the cart
            if ('parentRelationship' in line && line.parentRelationship?.parent) {
              return null;
            }
            return (
              <CartLineItem
                key={line.id}
                line={line}
                layout={layout}
                childrenMap={childrenMap}
              />
            );
          })}
        </ul>
        {cartHasItems && <CartSummary cart={cart} layout={layout} />}
      </div>
    </section>
  );
}

function CartEmpty({
  hidden = false,
}: {
  hidden: boolean;
  layout?: CartMainProps['layout'];
}) {
  const {close} = useAside();
  return (
    <div hidden={hidden} className="py-8">
      <p className="text-2xl leading-tight font-extrabold uppercase">
        Votre panier est vide.
      </p>
      <Link
        to="/collections/all"
        onClick={close}
        prefetch="viewport"
        className="mt-4 inline-block text-xs underline underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:hover:text-orange"
      >
        Voir les produits
      </Link>
    </div>
  );
}
