import {type FetcherWithComponents} from 'react-router';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import {LiquidButton} from '~/components/product/LiquidButton';

/**
 * Add-to-cart with one consistent action label:
 * "Ajouter au panier" → "Ajout…" while the request runs → "Épuisé" when unavailable.
 */
export function AddToCartButton({
  analytics,
  available,
  disabled,
  lines,
  onClick,
}: {
  analytics?: unknown;
  available: boolean;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<unknown>) => {
        const adding = fetcher.state !== 'idle';
        return (
          <>
            <input
              name="analytics"
              type="hidden"
              value={JSON.stringify(analytics)}
            />
            <LiquidButton
              type="submit"
              onClick={onClick}
              disabled={!available || disabled || adding}
              aria-live="polite"
            >
              {!available ? 'Épuisé' : adding ? 'Ajout…' : 'Ajouter au panier'}
            </LiquidButton>
          </>
        );
      }}
    </CartForm>
  );
}
