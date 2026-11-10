import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {Minus, Plus} from 'lucide-react';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import type {
  CartApiQueryFragment,
  CartLineFragment,
} from 'storefrontapi.generated';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * If the line is a parent line that has child components (like warranties or gift wrapping), they are
 * rendered nested below the parent line.
 */
export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;

  return (
    <li key={id} className="py-4">
      <div className="flex gap-4">
        <Link
          prefetch="intent"
          to={lineItemUrl}
          onClick={() => layout === 'aside' && close()}
          className="block aspect-[5/7] w-20 shrink-0 overflow-hidden bg-concrete"
          tabIndex={-1}
          aria-hidden
        >
          {image && (
            <Image
              alt=""
              aspectRatio="5/7"
              data={image}
              loading="lazy"
              width={160}
              className="size-full object-cover"
            />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => layout === 'aside' && close()}
              className="text-xs leading-snug font-bold uppercase [@media(hover:hover)_and_(pointer:fine)]:hover:text-orange"
            >
              {product.title}
            </Link>
            <ProductPrice
              className="shrink-0 justify-end"
              price={line?.cost?.totalAmount}
              compareAtPrice={
                line?.cost?.compareAtAmountPerQuantity
                  ? {
                      amount: String(
                        Number(line.cost.compareAtAmountPerQuantity.amount) *
                          line.quantity,
                      ),
                      currencyCode:
                        line.cost.compareAtAmountPerQuantity.currencyCode,
                    }
                  : null
              }
            />
          </div>
          {selectedOptions.some((o) => o.value !== 'Default Title') && (
            <ul className="mt-1 text-xs text-muted-foreground">
              {selectedOptions.map((option) => (
                <li key={option.name}>
                  {option.name} : {option.value}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto pt-3">
            <CartLineQuantity line={line} title={product.title} />
          </div>
        </div>
      </div>
      {lineItemChildren ? (
        <div>
          <p id={childrenLabelId} className="sr-only">
            Articles liés à {product.title}
          </p>
          <ul aria-labelledby={childrenLabelId} className="mt-3 pl-8">
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

const stepperButton =
  'grid size-8 place-items-center border border-ink/20 transition-colors duration-150 disabled:opacity-35 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:border-ink';

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 */
function CartLineQuantity({line, title}: {line: CartLine; title: string}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center" role="group" aria-label={`Quantité de ${title}`}>
        <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
          <button
            type="submit"
            className={stepperButton}
            aria-label="Diminuer la quantité"
            disabled={quantity <= 1 || !!isOptimistic}
            name="decrease-quantity"
            value={prevQuantity}
          >
            <Minus className="size-3.5" />
          </button>
        </CartLineUpdateButton>
        <span className="w-9 text-center text-xs tabular-nums" aria-live="polite">
          <span className="sr-only">Quantité : </span>
          {quantity}
        </span>
        <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
          <button
            type="submit"
            className={stepperButton}
            aria-label="Augmenter la quantité"
            name="increase-quantity"
            value={nextQuantity}
            disabled={!!isOptimistic}
          >
            <Plus className="size-3.5" />
          </button>
        </CartLineUpdateButton>
      </div>
      <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} />
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({
  lineIds,
  disabled,
}: {
  lineIds: string[];
  disabled: boolean;
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        disabled={disabled}
        type="submit"
        className="text-xs text-muted-foreground underline underline-offset-4 disabled:opacity-35 [@media(hover:hover)_and_(pointer:fine)]:hover:text-ink"
      >
        Retirer
      </button>
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @param lineIds - line ids affected by the update
 * @returns
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}
