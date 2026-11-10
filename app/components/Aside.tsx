import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {X} from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import {cn} from '~/lib/utils';

/** The one overlay open at a time: a side sheet, the header search, or none. */
type AsideType = 'search' | 'cart' | 'mobile' | 'closed';
type AsideContextValue = {
  type: AsideType;
  /** Opens `mode`; focus goes back to `opener` (default: the focused element) on close. */
  open: (mode: AsideType, opener?: HTMLElement | null) => void;
  close: () => void;
  /** Closes `mode` only if it is the one open (leaves another overlay alone). */
  closeIf: (mode: AsideType) => void;
  /** Focus back on the control that opened the overlay, if it is still there. */
  restoreFocus: () => void;
};

/**
 * Side panel (cart, mobile menu) built on shadcn's Sheet.
 * Keeps the skeleton API: <Aside type heading>, Aside.Provider, useAside().
 * Its header row has the bar's height; the close button sits where the
 * control that opened it was (the burger on the left, the bag on the right).
 */
export function Aside({
  children,
  heading,
  type,
  brand,
}: {
  children?: React.ReactNode;
  type: AsideType;
  heading: React.ReactNode;
  /** Shown in the middle of the header row (the title then stays for screen readers). */
  brand?: React.ReactNode;
}) {
  const {type: activeType, close, restoreFocus} = useAside();
  const expanded = type === activeType;
  const left = type === 'mobile';
  // Menu: the bar's 12px gutter on phones (X and logo land where ≡ and the
  // logo were). Cart: 20px, which CartSummary's full-bleed footer relies on.
  const gutter = left ? 'px-3 sm:px-5' : 'px-5';

  const closeButton = (
    <SheetClose
      className={cn(
        // Ring inside: on a full-width sheet the button reaches the screen edge
        'inline-flex size-11 items-center justify-center focus-visible:outline-offset-[-2px]',
        left
          ? 'col-start-1 -ml-[13px]'
          : 'col-start-3 -mr-[13px] justify-self-end',
      )}
    >
      <X aria-hidden className="bar-glyph size-[18px]" strokeWidth={1.75} />
      <span className="sr-only">Fermer</span>
    </SheetClose>
  );

  return (
    <Sheet open={expanded} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side={left ? 'left' : 'right'}
        showCloseButton={false}
        aria-describedby={undefined}
        // No Radix trigger: send focus back to the burger / bag explicitly
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
        className="w-full gap-0 border-none p-0 sm:max-w-[400px]"
      >
        <SheetHeader
          className={cn(
            'grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-0 border-b border-border py-0',
            gutter,
          )}
        >
          {left && closeButton}
          <SheetTitle
            className={cn(
              'text-xs font-extrabold uppercase',
              brand ? 'sr-only' : left ? 'col-start-2' : 'col-start-1',
            )}
          >
            {heading}
          </SheetTitle>
          {brand && <div className="col-start-2">{brand}</div>}
          {!left && closeButton}
        </SheetHeader>
        <div
          data-lenis-prevent
          className={cn('relative min-h-0 flex-1 overflow-y-auto', gutter)}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

Aside.Provider = function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((mode: AsideType, from?: HTMLElement | null) => {
    const focused =
      typeof document !== 'undefined' ? document.activeElement : null;
    opener.current =
      from ??
      (focused instanceof HTMLElement && focused !== document.body
        ? focused
        : null);
    setType(mode);
  }, []);
  const close = useCallback(() => setType('closed'), []);
  const closeIf = useCallback(
    (mode: AsideType) =>
      setType((current) => (current === mode ? 'closed' : current)),
    [],
  );
  const restoreFocus = useCallback(() => {
    const el = opener.current;
    if (el?.isConnected) el.focus({preventScroll: true});
  }, []);

  const value = useMemo(
    () => ({type, open, close, closeIf, restoreFocus}),
    [type, open, close, closeIf, restoreFocus],
  );

  return (
    <AsideContext.Provider value={value}>{children}</AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}
