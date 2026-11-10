import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {Link, useNavigate} from 'react-router';
import {ArrowLeft, ChevronDown} from 'lucide-react';
import {cn} from '~/lib/utils';
import {RevealTitle} from '~/components/motion/RevealTitle';
import {getLenis} from '~/components/motion/SmoothScroll';
import {LiquidLink} from '~/components/product/LiquidButton';
import {CONTACT_EMAIL} from './contact';
import type {LegalUpdated, TocEntry} from './legalHtml';

/*
 * Legal pages (policies, Shopify pages; the contact page uses proseClass).
 * Quiet document layout: the site's page title over a hairline (like the
 * catalogue), then a single reading column. The one accent is the butter
 * block, which marks "here" across the site (current page in the header):
 * in the table of contents it sits on the section being read and follows
 * the reader down the text.
 */

/**
 * Contact page with the message already started, in the customer's words
 * ("j'ai une question sur mes données personnelles").
 */
function contactHref(ask?: string) {
  if (!ask) return '/pages/contact';
  const message = `Bonjour, j’ai une question sur ${ask}\u00a0: `;
  return `/pages/contact?message=${encodeURIComponent(message)}`;
}

/**
 * Page title of the legal texts: the site's page title (same size and letter
 * rise as the catalogue and the contact page), with the way back to the
 * index above it and the date of the text under it.
 */
export function LegalTitle({
  children,
  eyebrowLink,
  updated,
}: {
  children: string;
  /** Way back to the parent page, above the title. */
  eyebrowLink?: {to: string; label: string};
  /** "Last updated" date of the text, printed under the title. */
  updated?: LegalUpdated | null;
}) {
  return (
    <header className="pt-8 pb-6 md:pt-12 md:pb-8">
      {eyebrowLink && (
        <Link
          to={eyebrowLink.to}
          prefetch="intent"
          className="mb-4 flex w-fit items-center gap-1.5 py-1 text-xs font-bold text-ink/60 transition-colors duration-150 hover:text-ink md:mb-6"
        >
          <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.75} />
          {eyebrowLink.label}
        </Link>
      )}
      {/* text-4xl from ~380px; just below, it shrinks so "remboursements" fits a 320px screen */}
      <RevealTitle className="text-[clamp(1.75rem,9.5vw,2.25rem)] leading-none tracking-tight text-balance normal-case md:text-6xl">
        {children}
      </RevealTitle>
      {updated && (
        <p className="mt-4 text-xs font-normal text-ink/60 md:mt-5">
          Mis à jour le <time dateTime={updated.iso}>{updated.long}</time>
        </p>
      )}
    </header>
  );
}

/** Reading styles for Shopify rich text (policies, pages, contact). */
export const proseClass = cn(
  'max-w-[66ch] text-[0.9375rem] leading-[1.7] font-normal text-ink/80 [overflow-wrap:break-word] md:text-base',
  '[&_p]:mb-4 [&_p:last-child]:mb-0',
  '[&_b]:font-semibold [&_b]:text-ink [&_em]:italic [&_strong]:font-semibold [&_strong]:text-ink',
  // Each section opens on a hairline. Anchored headings land below the fixed
  // header and the phone contents bar; on desktop, level with the contents' ink rule.
  '[&_h2]:mt-14 [&_h2]:mb-4 [&_h2]:scroll-mt-32 lg:[&_h2]:scroll-mt-31 [&_h2]:border-t [&_h2]:border-ink/15 [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:leading-tight [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-balance [&_h2]:text-ink md:[&_h2]:mt-16 md:[&_h2]:text-2xl',
  '[&_h2:first-child]:mt-0 [&_h2:first-child]:border-t-0 [&_h2:first-child]:pt-0',
  '[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:scroll-mt-32 lg:[&_h3]:scroll-mt-31 [&_h3]:text-base [&_h3]:leading-snug [&_h3]:font-bold [&_h3]:text-ink',
  '[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:font-bold [&_h4]:text-ink',
  // Lists: dashes for bullets, ink numbers
  "[&_ul]:mb-6 [&_ul>li]:relative [&_ul>li]:pl-5 [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:text-ink/40 [&_ul>li]:before:content-['–']",
  '[&_ol]:mb-6 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol>li]:pl-1 [&_ol>li]:marker:font-bold [&_ol>li]:marker:text-ink',
  '[&_li]:mb-2.5 [&_li_p]:mb-2 [&_li_ol]:mt-2.5 [&_li_ul]:mt-2.5',
  '[&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_a]:decoration-[1.5px] [&_a]:underline-offset-4 [&_a:hover]:text-orange',
  '[&_hr]:my-10 [&_hr]:border-ink/15',
  '[&_blockquote]:my-6 [&_blockquote]:border-l-[3px] [&_blockquote]:border-ink [&_blockquote]:pl-4',
  '[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full',
  // Tables keep their semantics; their wrapper (legalHtml.ts) scrolls
  // sideways on phones instead of widening the page. Head rule like the size chart.
  '[&_[data-table]]:mb-6 [&_[data-table]]:max-w-full [&_[data-table]]:overflow-x-auto',
  '[&_table]:min-w-full [&_table]:border-collapse [&_table]:text-sm',
  '[&_th]:border-b [&_th]:border-ink [&_th]:py-2 [&_th]:pr-6 [&_th]:text-left [&_th]:align-bottom [&_th]:font-bold [&_th]:text-ink',
  '[&_td]:border-b [&_td]:border-ink/15 [&_td]:py-2 [&_td]:pr-6 [&_td]:align-top',
);

/**
 * Id of the section being read: the last heading above a line at 30% of
 * the viewport. The observer only says "something crossed"; positions are
 * read then (a dozen headings at most).
 */
function useActiveSection(toc: TocEntry[]) {
  const [active, setActive] = useState<string | null>(null);
  const locked = useRef(false);
  const computeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const headings = toc
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!headings.length) return;

    const compute = () => {
      if (locked.current) return;
      const line = window.innerHeight * 0.3;
      let current: string | null = null;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > line + 1) break;
        current = heading.id;
      }
      setActive(current);
    };
    computeRef.current = compute;

    const observer = new IntersectionObserver(compute, {
      rootMargin: '0px 0px -70% 0px',
    });
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [toc]);

  /** Contents link: glide there (Lenis) or let the browser jump, then read on from it. */
  const go = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    setActive(id);
    const lenis = getLenis();
    if (lenis) {
      event.preventDefault();
      // hold the marker on the picked section while the page travels
      locked.current = true;
      const release = () => {
        window.clearTimeout(timer);
        locked.current = false;
        computeRef.current();
      };
      const timer = window.setTimeout(release, 2000);
      lenis.scrollTo(target, {onComplete: release});
      window.history.replaceState(window.history.state, '', `#${id}`);
    }
    // keyboard users continue from the section, not from the contents
    target.setAttribute('tabindex', '-1');
    target.focus({preventScroll: true});
  };

  return {active, go};
}

/**
 * Contents list, ruled like the size chart (ink head rule, faint rows). The
 * butter block is drawn once and moved (transform only) from row to row, so
 * it travels with the reading; it appears in place when it was hidden (top
 * of the text, phone contents just opened) instead of gliding from a stale row.
 */
function TocList({
  toc,
  active,
  onPick,
  className,
}: {
  toc: TocEntry[];
  active: string | null;
  onPick: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const block = blockRef.current;
    if (!list || !block) return;
    const place = () => {
      const row = active
        ? list.querySelector<HTMLElement>(`[data-toc="${CSS.escape(active)}"]`)
        : null;
      // hidden list (closed phone contents) has no size: nothing to place
      if (!row || !list.offsetHeight) {
        block.style.opacity = '0';
        return;
      }
      const appear = block.style.opacity !== '1';
      if (appear) block.style.transition = 'none';
      // 1px-high block scaled to the row: no layout work while it moves
      block.style.transform = `translateY(${row.offsetTop}px) scaleY(${row.offsetHeight})`;
      block.style.opacity = '1';
      if (appear) {
        void block.offsetWidth; // commit the jump before the glide comes back
        block.style.transition = '';
      }
    };
    place();
    // rows rewrap on resize, font load, or when the phone contents open
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [active]);

  return (
    <div
      ref={listRef}
      className={cn('relative border-t border-ink', className)}
    >
      <span
        ref={blockRef}
        aria-hidden
        className="nav-block pointer-events-none absolute inset-x-0 top-0 h-px origin-top bg-butter opacity-0"
      />
      <ol>
        {toc.map((entry) => {
          const current = entry.id === active;
          return (
            <li
              key={entry.id}
              data-toc={entry.id}
              className="border-b border-ink/10"
            >
              <a
                href={`#${entry.id}`}
                onClick={(event) => onPick(event, entry.id)}
                aria-current={current ? 'location' : undefined}
                className={cn(
                  // taller rows on touch screens (phone bar), denser in the desktop column
                  'relative block py-3 pr-2 text-xs leading-snug transition-colors duration-150 focus-visible:-outline-offset-2 lg:py-2.5',
                  entry.level === 3 ? 'pl-5 font-normal' : 'pl-2 font-bold',
                  current ? 'text-ink' : 'text-ink/60 hover:text-ink',
                )}
              >
                {entry.text}
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Phones and tablets: the contents fold into a bar held under the header,
 * which names the section being read. The list opens over the text, so the
 * reading position never moves; it closes on a pick, a tap outside, Escape,
 * or when focus moves on.
 */
function TocBar({
  toc,
  active,
  onPick,
}: {
  toc: TocEntry[];
  active: string | null;
  onPick: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const current = toc.find((entry) => entry.id === active);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const details = ref.current;
      if (details && !details.contains(event.target as Node)) {
        details.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const details = ref.current;
      if (event.key !== 'Escape' || !details) return;
      details.open = false;
      details.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <details
      ref={ref}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onBlur={(event) => {
        // tabbing out of the open list closes it (a click outside is handled above)
        const next = event.relatedTarget as Node | null;
        if (next && !event.currentTarget.contains(next)) {
          event.currentTarget.open = false;
        }
      }}
      className="group sticky top-14 z-30 -mx-(--gutter) bg-paper/95 px-(--gutter) backdrop-blur-xl md:top-16 lg:hidden"
    >
      <summary className="flex h-12 list-none items-center gap-3 border-b border-ink/15 focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="shrink-0 text-xs font-bold">Sommaire</span>
        <span className="min-w-0 flex-1 truncate text-xs font-normal text-ink/60">
          {current?.text ?? `${toc.length} sections`}
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 transition-transform duration-200 ease-(--ease-out) group-open:rotate-180 motion-reduce:transition-none"
          strokeWidth={1.75}
        />
      </summary>
      {/* Flat sheet over the text; its ink bottom edge says where it ends */}
      <nav
        aria-label="Sommaire"
        data-lenis-prevent
        className="absolute inset-x-0 top-full max-h-[min(60dvh,28rem)] overflow-y-auto border-b border-ink bg-paper px-(--gutter)"
      >
        <TocList
          toc={toc}
          active={active}
          onPick={(event, id) => {
            if (ref.current) ref.current.open = false;
            onPick(event, id);
          }}
          // the bar's own rule is the head; the sheet's edge closes the list
          className="border-t-0 [&_li:last-child]:border-b-0"
        />
      </nav>
    </details>
  );
}

/**
 * A Shopify text set for reading: contents (sticky column on desktop, bar
 * under the header on smaller screens) and one column of prose. `children`
 * closes the text (e.g. a way to ask a question).
 */
export function LegalArticle({
  html,
  toc,
  aside,
  children,
}: {
  html: string;
  toc: TocEntry[];
  aside?: ReactNode;
  children?: ReactNode;
}) {
  const labelId = useId();
  const stickyRef = useRef<HTMLDivElement>(null);
  const {active, go} = useActiveSection(toc);
  // a single heading needs no contents
  const hasToc = toc.length > 1;

  // The desktop contents column keeps the wheel (Lenis lets go) only when
  // it is taller than the screen and scrolls on its own
  useEffect(() => {
    const column = stickyRef.current;
    if (!column) return;
    const update = () =>
      column.toggleAttribute(
        'data-lenis-prevent',
        column.scrollHeight > column.clientHeight + 1,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(column);
    for (const child of column.children) observer.observe(child);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="border-t border-ink/15">
      {hasToc && <TocBar toc={toc} active={active} onPick={go} />}
      <div
        className={cn(
          'grid gap-10 pt-8 md:pt-10',
          (hasToc || aside) &&
            'lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-24',
        )}
      >
        {(hasToc || aside) && (
          <aside className="max-lg:hidden">
            {/* below the 4rem header; scrolls on its own when taller than the screen */}
            <div
              ref={stickyRef}
              className="sticky top-24 flex max-h-[calc(100dvh-7.5rem)] flex-col gap-8 overflow-y-auto pb-4"
            >
              {hasToc && (
                <nav aria-labelledby={labelId}>
                  <p
                    id={labelId}
                    className="mb-3 text-xs font-normal text-ink/60"
                  >
                    Sommaire
                  </p>
                  <TocList toc={toc} active={active} onPick={go} />
                </nav>
              )}
              {aside}
            </div>
          </aside>
        )}
        <div className="min-w-0">
          <div
            className={proseClass}
            dangerouslySetInnerHTML={{__html: html}}
          />
          {children && (
            // same font size as the prose, so 66ch is the same width
            <div className="mt-16 max-w-[66ch] border-t border-ink/15 pt-5 text-[0.9375rem] md:mt-20 md:text-base">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** "A question about …? Write to us": closes a text, or the index. */
export function LegalQuestion({
  about,
  ask,
  lead,
  className,
}: {
  /** What the text covers, in the shop's words ("vos données personnelles"). */
  about?: string;
  /** The same subject in the customer's words, to start the message ("mes données personnelles"). */
  ask?: string;
  /** Replaces "Une question sur … ?" */
  lead?: string;
  className?: string;
}) {
  return (
    <p className={cn('text-sm font-normal text-ink/70', className)}>
      {lead ?? `Une question sur ${about ?? 'ce texte'}\u00a0?`}{' '}
      <Link
        to={contactHref(ask ?? about)}
        prefetch="intent"
        className="font-bold text-ink underline decoration-[1.5px] underline-offset-4 hover:text-orange"
      >
        Écrivez-nous
      </Link>
      , on vous répond par email.
    </p>
  );
}

/**
 * Honest placeholder when Shopify has no text for a page yet, turned into a
 * way to get the answer anyway: the question goes to the contact page with
 * its subject already written.
 */
export function LegalEmpty({
  children,
  about,
  ask,
}: {
  children?: ReactNode;
  /** What the missing text covers, in the shop's words ("la livraison"). */
  about?: string;
  /** The same subject in the customer's words, to start the message. */
  ask?: string;
}) {
  const navigate = useNavigate();
  const to = contactHref(ask ?? about);

  return (
    <div className="border-t border-ink/15 pt-8 md:pt-10">
      <div className="max-w-[40rem]">
        <h2 className="text-xl leading-snug font-bold tracking-tight md:text-2xl">
          Cette page arrive bientôt.
        </h2>
        <p className="mt-3 max-w-[48ch] text-sm leading-relaxed font-normal text-ink/70 md:text-base">
          {children ??
            `En attendant, posez-nous votre question${about ? ` sur ${about}` : ''}\u00a0: on vous répond par email.`}
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* the site's ink button; in-app navigation keeps the page transition */}
          <LiquidLink
            href={to}
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              void navigate(to);
            }}
            className="h-12 w-full px-8 sm:w-auto"
          >
            Poser une question
          </LiquidLink>
          <p className="text-sm font-normal text-ink/60">
            ou écrivez à{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-bold text-ink underline decoration-[1.5px] underline-offset-4 [overflow-wrap:anywhere] hover:text-orange"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
