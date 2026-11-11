import {useEffect, useRef} from 'react';
import {Link} from 'react-router';
import {StickerLogo} from '~/components/StickerLogo';
import {
  CURVE_IN_OUT,
  CURVE_OUT,
  gsap,
  prefersReducedMotion,
  SplitText,
} from '~/lib/gsap';
import {onSiteLoaded} from '~/lib/siteLoader';
import {HeroPhoto, type HeroImage} from './HeroPhoto';

/**
 * What the hero shows, edited by the client in Shopify (Contenu → Métaobjets
 * → « Accueil — hero », entry "accueil"); see the home route's loader.
 */
export type HeroContent = {
  /** Word before the name: "Nouveau" unless the entry says otherwise */
  label: string;
  /** Featured collection, else product, else the latest product */
  feature: {title: string; href: string} | null;
  image: HeroImage | null;
  imageMobile: HeroImage | null;
};

/**
 * Home hero: the photo, still, with an ink gradient rising from the bottom
 * under the caption (.hero-shade), the "mmm" logo above it, and the featured
 * drop, big, at the bottom.
 * - Load (after the site loader, which opens onto this hero): the logo comes
 *   into focus (blur + opacity); the label is wiped in, butter; the name's
 *   letters rise out of their words, tilting upright.
 * - Scroll: nothing moves; the text scrolls away with the photo (the user
 *   doesn't want it to fade).
 * Reduced motion: everything at rest.
 */
export function Hero({hero}: {hero: HeroContent}) {
  const rootRef = useRef<HTMLElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);
  const {feature, label} = hero;

  useEffect(() => {
    const root = rootRef.current;
    const sticker = stickerRef.current;
    const whole = sticker?.querySelector<HTMLElement>('[data-sticker]');
    if (!root || !sticker || !whole) return;
    if (prefersReducedMotion()) return;

    const tag = root.querySelector<HTMLElement>('[data-hero-label]');
    const title = root.querySelector<HTMLElement>('[data-hero-title]');
    // (cast: assigned in the context callback, TS would narrow it to null)
    let split = null as SplitText | null;
    let cancel = () => {};
    const ctx = gsap.context(() => {
      const intro = gsap
        .timeline({
          delay: 0.15,
          paused: true,
          onComplete: () => {
            gsap.set(whole, {clearProps: 'filter'});
          },
        })
        .set(sticker, {opacity: 1}, 0)
        .fromTo(
          whole,
          {opacity: 0, filter: 'blur(18px)'},
          {opacity: 1, filter: 'blur(0px)', duration: 1, ease: CURVE_OUT},
          0,
        );

      // No featured drop: the hero is just the photo and the logo
      if (tag && title) {
        // The butter label is wiped in from the left
        intro.fromTo(
          tag,
          {clipPath: 'inset(0% 100% 0% 0%)'},
          {clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: CURVE_IN_OUT},
          0.35,
        );
        // Words are masks (they wrap freely, whatever the font's metrics);
        // each letter rises out of its word, tilted, and settles upright
        split = SplitText.create(title, {
          type: 'words,chars',
          mask: 'words',
          wordsClass: 'hero-word',
          aria: 'none', // the link's name is in its sr-only copy
        });
        intro.from(
          split.chars,
          {
            yPercent: 125,
            rotate: 10,
            transformOrigin: '0% 100%',
            duration: 1.1,
            ease: CURVE_OUT,
            stagger: 0.035,
          },
          0.55,
        );
      }

      cancel = onSiteLoaded(() => {
        intro.play();
      });
    }, root);

    return () => {
      cancel();
      ctx.revert();
      split?.revert();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      data-hero
      className="relative h-svh min-h-[560px] w-full overflow-hidden bg-ink"
    >
      <h1 className="sr-only">333bei</h1>
      {/* The photo, still: colour kept; ink rises from the bottom, under the
          caption, and fades out before the logo */}
      <div aria-hidden className="absolute inset-0">
        <HeroPhoto image={hero.image} imageMobile={hero.imageMobile} />
      </div>
      <div aria-hidden className="hero-shade absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div
          ref={stickerRef}
          className="hero-sticker -translate-y-[3%] w-[46vw] md:w-[min(30vw,calc(27svh*1.6))]"
        >
          <StickerLogo />
        </div>
      </div>

      {feature && (
        <div
          data-hero-caption
          className="site-gutter absolute inset-x-0 bottom-0 pb-5 text-paper md:pb-6"
        >
          <Link
            to={feature.href}
            prefetch="intent"
            className="group block max-w-full min-w-0"
          >
            <span className="sr-only">
              {label} : {feature.title}
            </span>
            <span aria-hidden className="block">
              <span
                data-hero-label
                className="inline-block bg-butter px-2 py-1.5 text-xs leading-none font-bold tracking-wide text-ink uppercase md:text-sm"
              >
                {label}
              </span>
              <span
                data-hero-title
                // Phones: scales with the screen so a long word still fits
                // a 320px one (each word is a mask and can't break)
                className="mt-3 block text-[clamp(2.25rem,11.5vw,7rem)] leading-[0.86] md:text-[clamp(2.75rem,8vw,7rem)] font-extrabold tracking-tight uppercase transition-colors duration-300 ease-out group-hover:text-butter md:mt-4"
              >
                {feature.title}
              </span>
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}
