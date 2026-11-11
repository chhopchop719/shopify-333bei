import {
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Form, Link, useFetcher, useLocation, useNavigate} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {X} from 'lucide-react';
import type {SearchCatalogReturn} from '~/lib/search';
import {
  type CatalogMatch,
  type CatalogProduct,
  markPieces,
  matchCatalog,
} from '~/lib/searchCatalog';
import {formatPrice} from '~/lib/money';

/** Rows listed before anything is typed (the newest products). */
const IDLE_ROWS = 12;
/** Rows listed while typing; the full search page has the rest. */
const MATCH_ROWS = 24;

/**
 * The catalogue the panel filters, fetched once (on the first open, or as
 * soon as the search button is pointed or focused) and kept by the fetcher.
 */
export function useSearchCatalog() {
  const fetcher = useFetcher<SearchCatalogReturn>({key: 'search-catalog'});
  const {state, data, load} = fetcher;
  const preload = useCallback(() => {
    if (state === 'idle' && !data) void load('/search?catalog');
  }, [state, data, load]);
  return {data, preload};
}

/** Follows a link in this tab (no modifier key, primary button)? */
const followsHere = (event: React.MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

const productUrl = (product: CatalogProduct) => `/products/${product.handle}`;
const priceOf = (product: CatalogProduct) =>
  product.availableForSale
    ? formatPrice(product.priceRange.minVariantPrice)
    : 'Épuisé';

/**
 * Search, "Index": an ink panel unrolls from the top over the whole page and
 * lists the catalogue in big capitals; typing filters it on the spot (the
 * typed letters marked butter). Pointing a row, or moving with ↑ ↓, slides a
 * butter arrow before it and (from md) shows its photo on the right; Enter
 * opens that product, or the full /search page when no row is picked.
 * Esc or "Fermer" closes it, and so does following any of its links.
 * Its open state is the Aside one ('search'): one overlay at a time, and the
 * smooth scroll is paused by SmoothScroll like for the sheets.
 */
export function SearchIndex({
  open,
  onClose,
  toggleRef,
}: {
  open: boolean;
  /** Stable callback: closes the search. */
  onClose: () => void;
  /** The header button that opens it: focus goes back there on close. */
  toggleRef: RefObject<HTMLButtonElement | null>;
}) {
  const {data, preload} = useSearchCatalog();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('');
  const [active, setActive] = useState(-1);
  const [typed, setTyped] = useState(false);
  // New key on each opening: the rows' cascade plays again
  const [opening, setOpening] = useState(0);
  const listId = useId();
  const {key} = useLocation();

  const products = data?.products;
  const term = value.trim();
  const matches = useMemo(
    () => (products ? matchCatalog(products, term) : []),
    [products, term],
  );
  const rows = matches.slice(0, term ? MATCH_ROWS : IDLE_ROWS);
  const shown = rows[active] ?? rows[0];
  const searchUrl = `/search?q=${encodeURIComponent(term)}`;

  let count = 'Chargement…';
  // Dropped on phones, where the top row is shared with "Fermer"
  let countLead = '';
  if (products && data?.error && !products.length) count = 'Indisponible';
  else if (products && !term) {
    countLead = 'Tout le catalogue · ';
    count = `${products.length} produit${products.length > 1 ? 's' : ''}`;
  } else if (products) {
    count = matches.length
      ? `${matches.length} produit${matches.length > 1 ? 's' : ''}`
      : 'Aucun produit';
  }

  useEffect(() => {
    if (open) preload();
  }, [open, preload]);

  // Open: focus the field (text selected: typing replaces it), the page and
  // the bar under the panel are inert, Esc closes. Closed: focus back on the
  // header button if it was in the panel.
  useEffect(() => {
    if (!open) return;
    setOpening((n) => n + 1);
    setTyped(false);
    setActive(-1);
    const input = inputRef.current;
    const panel = rootRef.current;
    const toggle = toggleRef.current;
    input?.focus({preventScroll: true});
    input?.select();
    const covered = [
      document.querySelector<HTMLElement>('[data-page]'),
      document.querySelector<HTMLElement>('[data-site-header]'),
    ];
    covered.forEach((el) => el?.setAttribute('inert', ''));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      covered.forEach((el) => el?.removeAttribute('inert'));
      const focused = document.activeElement;
      if (!focused || focused === document.body || panel?.contains(focused)) {
        toggle?.focus({preventScroll: true});
      }
    };
  }, [open, onClose, toggleRef]);

  // Safety net: any navigation (same URL included) closes it
  useEffect(() => {
    onClose();
  }, [key, onClose]);

  /** Keeps the row picked with the keyboard inside the scrolling list. */
  const reveal = (index: number) => {
    const scroller = scrollerRef.current;
    const row = scroller?.querySelector<HTMLElement>(`[data-row="${index}"]`);
    if (!scroller || !row) return;
    if (row.offsetTop < scroller.scrollTop) scroller.scrollTop = row.offsetTop;
    else if (
      row.offsetTop + row.offsetHeight >
      scroller.scrollTop + scroller.clientHeight
    ) {
      scroller.scrollTop =
        row.offsetTop + row.offsetHeight - scroller.clientHeight;
    }
  };

  const closeOnFollow = (event: React.MouseEvent) => {
    if (followsHere(event)) onClose();
  };

  return (
    <div
      ref={rootRef}
      id="header-search"
      role="dialog"
      aria-modal="true"
      aria-label="Recherche"
      aria-hidden={!open}
      data-open={open}
      // Closed: out of the tab order, from the server render on (React 18
      // has no `inert` prop; the plain attribute is passed through)
      {...(open ? {} : {inert: ''})}
      className="search-index fixed inset-0 z-50 bg-ink text-paper print:hidden"
    >
      <div className="site-gutter flex h-full flex-col">
        {/* Same height as the bar: "Fermer" sits where the bar's icons are */}
        <div className="flex h-(--header-h) shrink-0 items-center gap-4 text-2xs font-bold tracking-[0.08em] uppercase">
          <span className="text-butter">Recherche</span>
          <span aria-hidden className="truncate text-paper/55 tabular-nums">
            {countLead && <span className="max-sm:hidden">{countLead}</span>}
            {count}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="-mr-3 ml-auto inline-flex h-11 shrink-0 items-center gap-2 px-3 uppercase transition-colors duration-200 ease-out hover:text-butter md:h-9"
          >
            Fermer
            <X aria-hidden className="size-4" strokeWidth={2} />
          </button>
        </div>

        <Form
          action="/search"
          method="get"
          role="search"
          className="shrink-0"
          onSubmit={(event) => {
            const picked = rows[active];
            if (picked) {
              event.preventDefault();
              onClose();
              void navigate(productUrl(picked.product));
              return;
            }
            if (!term) {
              event.preventDefault();
              return;
            }
            onClose();
          }}
        >
          <label htmlFor={`${listId}-input`} className="sr-only">
            Rechercher un produit
          </label>
          <input
            ref={inputRef}
            id={`${listId}-input`}
            name="q"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Cherchez une pièce"
            role="combobox"
            aria-expanded={rows.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              rows[active] ? `${listId}-${active}` : undefined
            }
            value={value}
            onChange={(event) => {
              setValue(event.currentTarget.value);
              setTyped(true);
              setActive(-1);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
              if (!rows.length) return;
              event.preventDefault();
              const next =
                event.key === 'ArrowDown'
                  ? (active + 1) % rows.length
                  : active <= 0
                    ? rows.length - 1
                    : active - 1;
              setActive(next);
              reveal(next);
            }}
            // Phones: the rows' size; wider, it grows with the screen.
            // Ellipsis: a placeholder too long for the field is never cut dry
            className="m-0 block w-full rounded-none border-0 bg-transparent p-0 pt-1 pb-5 text-[1.625rem] leading-tight font-extrabold tracking-[-0.025em] text-ellipsis text-paper uppercase caret-butter outline-none placeholder:text-paper/30 md:text-[clamp(1.75rem,3.4vw,2.375rem)] [&::-webkit-search-cancel-button]:hidden"
          />
        </Form>
        <span aria-live="polite" className="sr-only">
          {term ? count : ''}
        </span>

        <div className="grid min-h-0 flex-1 gap-[clamp(1.25rem,3vw,2.5rem)] md:grid-cols-[minmax(0,1fr)_clamp(9.5rem,21vw,16rem)]">
          <div
            ref={scrollerRef}
            data-lenis-prevent
            className="relative min-h-0 overflow-y-auto overscroll-contain pb-8"
          >
            <ul
              key={opening}
              id={listId}
              role="listbox"
              aria-label="Produits"
              data-phase={typed ? 'type' : 'enter'}
              className="search-index-list"
            >
              {rows.map((match, index) => (
                <Row
                  key={match.product.id}
                  id={`${listId}-${index}`}
                  index={index}
                  match={match}
                  selected={index === active}
                  onPoint={() => {
                    if (index !== active) setActive(index);
                  }}
                  onFollow={closeOnFollow}
                />
              ))}
            </ul>

            {products && term && !matches.length && (
              <p className="border-t border-paper/15 py-3.5 text-base text-paper/75">
                Rien pour « {term} ».{' '}
                <Link
                  to={searchUrl}
                  onClick={closeOnFollow}
                  className="text-paper underline underline-offset-4 transition-colors duration-200 ease-out hover:text-butter"
                >
                  Lancer la recherche complète
                </Link>{' '}
                ou{' '}
                <Link
                  to="/collections/all"
                  onClick={closeOnFollow}
                  className="text-paper underline underline-offset-4 transition-colors duration-200 ease-out hover:text-butter"
                >
                  voir tout le catalogue
                </Link>
                .
              </p>
            )}
            {products && !products.length && !term && (
              <p className="border-t border-paper/15 py-3.5 text-base text-paper/75">
                La liste n’a pas pu se charger.{' '}
                <Link
                  to="/collections/all"
                  onClick={closeOnFollow}
                  className="text-paper underline underline-offset-4 transition-colors duration-200 ease-out hover:text-butter"
                >
                  Voir le catalogue
                </Link>
              </p>
            )}
            {rows.length > 0 && (term || matches.length > rows.length) && (
              <p className="border-t border-paper/15 pt-3.5">
                <Link
                  to={term ? searchUrl : '/collections/all'}
                  onClick={closeOnFollow}
                  className="text-xs font-bold underline underline-offset-4 transition-colors duration-200 ease-out hover:text-butter"
                >
                  {term
                    ? `Tous les résultats pour « ${term} »`
                    : `Tout le catalogue · ${matches.length} produits`}
                </Link>
              </p>
            )}
          </div>

          {/* The pointed row's photo (the first row's until then) */}
          <figure
            aria-hidden
            className="m-0 hidden self-start md:grid md:gap-2"
          >
            {shown && (
              <>
                <div className="aspect-[5/7] overflow-hidden bg-paper/10">
                  {shown.product.featuredImage && (
                    <Image
                      key={shown.product.id}
                      data={shown.product.featuredImage}
                      aspectRatio="5/7"
                      sizes="16rem"
                      alt=""
                      className="search-index-photo size-full object-cover"
                    />
                  )}
                </div>
                <figcaption className="text-2xs font-bold tracking-[0.06em] text-paper/55 uppercase">
                  {shown.product.title} · {priceOf(shown.product)}
                </figcaption>
              </>
            )}
          </figure>
        </div>
      </div>
    </div>
  );
}

function Row({
  id,
  index,
  match,
  selected,
  onPoint,
  onFollow,
}: {
  id: string;
  index: number;
  match: CatalogMatch;
  selected: boolean;
  onPoint: () => void;
  onFollow: (event: React.MouseEvent) => void;
}) {
  const {product, marks} = match;
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      data-row={index}
      style={{'--i': index} as React.CSSProperties}
      className="search-index-row"
      // pointermove, not enter: a list scrolling under a still pointer
      // doesn't steal the row picked with the keyboard
      onPointerMove={onPoint}
    >
      <Link
        to={productUrl(product)}
        prefetch="intent"
        tabIndex={-1}
        onClick={onFollow}
        className="grid grid-cols-[2.375rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-t border-paper/15 py-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline md:gap-4 md:pb-2"
      >
        {/* Phones: a small photo before the name (no photo column there) */}
        <span className="row-span-2 block aspect-[5/7] w-[2.375rem] overflow-hidden bg-paper/10 md:hidden">
          {product.featuredImage && (
            <Image
              data={product.featuredImage}
              aspectRatio="5/7"
              sizes="38px"
              loading="lazy"
              alt=""
              className="size-full object-cover"
            />
          )}
        </span>
        <span className="search-index-name min-w-0 text-[1.625rem] leading-[0.92] font-extrabold tracking-[-0.04em] [overflow-wrap:anywhere] uppercase md:text-[clamp(1.75rem,5.2vw,4rem)]">
          {markPieces(product.title, marks).map((piece) =>
            piece.marked ? (
              <mark key={piece.start}>{piece.text}</mark>
            ) : (
              <span key={piece.start}>{piece.text}</span>
            ),
          )}
        </span>
        <span className="flex gap-3.5 text-xs font-bold whitespace-nowrap text-paper/55 tabular-nums">
          {product.productType && <span>{product.productType}</span>}
          <span className="text-paper">{priceOf(product)}</span>
        </span>
      </Link>
    </li>
  );
}
