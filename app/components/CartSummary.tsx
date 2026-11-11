import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {LiquidLink} from '~/components/product/LiquidButton';

const fieldClass =
  'h-10 min-w-0 flex-1 border border-ink/20 bg-transparent px-3 text-xs font-medium placeholder:text-muted-foreground focus-visible:border-ink';
const smallButton =
  'h-10 shrink-0 border border-ink px-4 text-xs font-semibold transition-colors duration-150 disabled:opacity-40 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:bg-ink [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:text-paper';
const linkButton =
  'text-xs text-muted-foreground underline underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:hover:text-ink';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

export function CartSummary({cart, layout}: CartSummaryProps) {
  const className =
    layout === 'page'
      ? 'flex flex-col gap-5 border-t pt-5 lg:sticky lg:top-[calc(var(--header-h)+1.25rem)] lg:border-t-0 lg:bg-concrete lg:p-6'
      : 'sticky bottom-0 -mx-5 mt-4 flex flex-col gap-4 border-t bg-paper px-5 pt-4 pb-5';
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const giftCardHeadingId = useId();
  const giftCardInputId = useId();

  return (
    <div aria-labelledby={summaryId} className={className}>
      <h2 id={summaryId} className="sr-only">
        Récapitulatif
      </h2>
      <dl role="group" className="flex items-baseline justify-between">
        <dt className="text-xs font-semibold uppercase">Sous-total</dt>
        <dd className="text-sm font-bold tabular-nums">
          {cart?.cost?.subtotalAmount?.amount ? (
            <Money data={cart?.cost?.subtotalAmount} />
          ) : (
            '-'
          )}
        </dd>
      </dl>
      <p className="-mt-2 text-xs text-muted-foreground">
        Livraison et taxes calculées à la commande.
      </p>
      <CartDiscounts
        discountCodes={cart?.discountCodes}
        discountsHeadingId={discountsHeadingId}
        discountCodeInputId={discountCodeInputId}
      />
      <CartGiftCard
        giftCardCodes={cart?.appliedGiftCards}
        giftCardHeadingId={giftCardHeadingId}
        giftCardInputId={giftCardInputId}
      />
      <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} />
    </div>
  );
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl?: string}) {
  if (!checkoutUrl) return null;

  return (
    <LiquidLink href={checkoutUrl} target="_self">
      Passer commande
    </LiquidLink>
  );
}

function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  discountsHeadingId: string;
  discountCodeInputId: string;
}) {
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <details className="group text-xs [&_summary::-webkit-details-marker]:hidden">
      <summary className="cursor-pointer list-none font-semibold underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:hover:underline">
        Code promo
        <span aria-hidden className="ml-1 inline-block transition-transform duration-200 group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 flex flex-col gap-2">
      {/* Have existing discount, display it with a remove option */}
      <dl hidden={!codes.length}>
        <div>
          <dt id={discountsHeadingId} className="sr-only">Codes promo appliqués</dt>
          <UpdateDiscountForm>
            <div
              className="flex items-center justify-between gap-3"
              role="group"
              aria-labelledby={discountsHeadingId}
            >
              <code className="font-semibold uppercase">{codes?.join(', ')}</code>
              <button type="submit" className={linkButton} aria-label="Retirer le code promo">
                Retirer
              </button>
            </div>
          </UpdateDiscountForm>
        </div>
      </dl>

      {/* Show an input to apply a discount */}
      <UpdateDiscountForm discountCodes={codes}>
        <div className="flex gap-2">
          <label htmlFor={discountCodeInputId} className="sr-only">
            Code promo
          </label>
          <input
            id={discountCodeInputId}
            type="text"
            name="discountCode"
            placeholder="Code promo"
            className={fieldClass}
          />
          <button type="submit" className={smallButton} aria-label="Appliquer le code promo">
            Appliquer
          </button>
        </div>
      </UpdateDiscountForm>
      </div>
    </details>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}

function CartGiftCard({
  giftCardCodes,
  giftCardHeadingId,
  giftCardInputId,
}: {
  giftCardCodes: CartApiQueryFragment['appliedGiftCards'] | undefined;
  giftCardHeadingId: string;
  giftCardInputId: string;
}) {
  const giftCardCodeInput = useRef<HTMLInputElement>(null);
  const removeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const previousCardIdsRef = useRef<string[]>([]);
  const giftCardAddFetcher = useFetcher({key: 'gift-card-add'});
  const [removedCardIndex, setRemovedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (giftCardAddFetcher.data) {
      if (giftCardCodeInput.current !== null) {
        giftCardCodeInput.current.value = '';
      }
    }
  }, [giftCardAddFetcher.data]);

  useEffect(() => {
    const currentCardIds = giftCardCodes?.map((card) => card.id) || [];

    if (removedCardIndex !== null && giftCardCodes) {
      const focusTargetIndex = Math.min(
        removedCardIndex,
        giftCardCodes.length - 1,
      );
      const focusTargetCard = giftCardCodes[focusTargetIndex];
      const focusButton = focusTargetCard
        ? removeButtonRefs.current.get(focusTargetCard.id)
        : null;

      if (focusButton) {
        focusButton.focus();
      } else if (giftCardCodeInput.current) {
        giftCardCodeInput.current.focus();
      }

      setRemovedCardIndex(null);
    }

    previousCardIdsRef.current = currentCardIds;
  }, [giftCardCodes, removedCardIndex]);

  const handleRemoveClick = (cardId: string) => {
    const index = previousCardIdsRef.current.indexOf(cardId);
    if (index !== -1) {
      setRemovedCardIndex(index);
    }
  };

  return (
    <details className="group text-xs [&_summary::-webkit-details-marker]:hidden">
      <summary className="cursor-pointer list-none font-semibold underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:hover:underline">
        Carte cadeau
        <span aria-hidden className="ml-1 inline-block transition-transform duration-200 group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 flex flex-col gap-2">
      {giftCardCodes && giftCardCodes.length > 0 && (
        <dl>
          <dt id={giftCardHeadingId} className="sr-only">Cartes cadeaux appliquées</dt>
          {giftCardCodes.map((giftCard) => (
            <dd key={giftCard.id} className="flex items-center gap-2">
              <RemoveGiftCardForm
                giftCardId={giftCard.id}
                lastCharacters={giftCard.lastCharacters}
                onRemoveClick={() => handleRemoveClick(giftCard.id)}
                buttonRef={(el: HTMLButtonElement | null) => {
                  if (el) {
                    removeButtonRefs.current.set(giftCard.id, el);
                  } else {
                    removeButtonRefs.current.delete(giftCard.id);
                  }
                }}
              >
                <code>***{giftCard.lastCharacters}</code>
                &nbsp;
                <Money data={giftCard.amountUsed} />
              </RemoveGiftCardForm>
            </dd>
          ))}
        </dl>
      )}

      <AddGiftCardForm fetcherKey="gift-card-add">
        <div className="flex gap-2">
          <label htmlFor={giftCardInputId} className="sr-only">
            Code de la carte cadeau
          </label>
          <input
            id={giftCardInputId}
            type="text"
            name="giftCardCode"
            placeholder="Code de la carte cadeau"
            ref={giftCardCodeInput}
            className={fieldClass}
          />
          <button
            type="submit"
            className={smallButton}
            disabled={giftCardAddFetcher.state !== 'idle'}
            aria-label="Appliquer la carte cadeau"
          >
            Appliquer
          </button>
        </div>
      </AddGiftCardForm>
      </div>
    </details>
  );
}

function AddGiftCardForm({
  fetcherKey,
  children,
}: {
  fetcherKey?: string;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      fetcherKey={fetcherKey}
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesAdd}
    >
      {children}
    </CartForm>
  );
}

function RemoveGiftCardForm({
  giftCardId,
  lastCharacters,
  children,
  onRemoveClick,
  buttonRef,
}: {
  giftCardId: string;
  lastCharacters: string;
  children: React.ReactNode;
  onRemoveClick?: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{
        giftCardCodes: [giftCardId],
      }}
    >
      <span className="flex items-center gap-2">
        {children}
        <button
          type="submit"
          className={linkButton}
          aria-label={`Retirer la carte cadeau se terminant par ${lastCharacters}`}
          onClick={onRemoveClick}
          ref={buttonRef}
        >
          Retirer
        </button>
      </span>
    </CartForm>
  );
}
