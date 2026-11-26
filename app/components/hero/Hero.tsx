import {useEffect, useRef} from 'react';
import {Link} from 'react-router';
import {ArrowRight} from 'lucide-react';
import {StickerLogo} from '~/components/StickerLogo';
import {CURVE_OUT, gsap, prefersReducedMotion} from '~/lib/gsap';
import {onSiteLoaded} from '~/lib/siteLoader';
import {HeroPhoto, type HeroImage} from './HeroPhoto';

/**
 * What the hero shows, edited by the client in Shopify (Contenu → Métaobjets
 * → « Accueil — hero », entry "accueil"): the background photo, and its
 * portrait variant for phones. See the home route's loader.
 */
export type HeroContent = {
  image: HeroImage | null;
  imageMobile: HeroImage | null;
};

/**
 * Home hero: the photo, still, as a background, with an ink gradient rising
 * from the bottom (.hero-shade), the "mmm" logo in the middle and a
 * "Shop now" button under it, to the catalogue.
 * - Load (after the site loader, which opens onto this hero): the logo comes
 *   into focus (blur + opacity), the button rises in under it.
 * - Scroll: nothing moves.
 * Reduced motion: everything at rest.
 */
export function Hero({hero}: {hero: HeroContent}) {
  const stickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sticker = stickerRef.current;
    const whole = sticker?.querySelector<HTMLElement>('[data-sticker]');
    const cta = sticker?.querySelector<HTMLElement>('[data-hero-cta]');
    if (!sticker || !whole || !cta) return;
    if (prefersReducedMotion()) return;

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
        )
        .fromTo(
          cta,
          {opacity: 0, y: 14},
          {opacity: 1, y: 0, duration: 0.9, ease: CURVE_OUT},
          0.45,
        );

      cancel = onSiteLoaded(() => {
        intro.play();
      });
    }, sticker);

    return () => {
      cancel();
      ctx.revert();
    };
  }, []);

  return (
    <section
      data-hero
      className="relative h-svh min-h-[560px] w-full overflow-hidden bg-ink"
    >
      <h1 className="sr-only">333bei</h1>
      {/* The photo, still: colour kept; ink rises from the bottom and fades
          out before the logo */}
      <div aria-hidden className="absolute inset-0">
        <HeroPhoto image={hero.image} imageMobile={hero.imageMobile} />
      </div>
      <div aria-hidden className="hero-shade absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div
          ref={stickerRef}
          className="hero-sticker relative -translate-y-[3%] w-[46vw] md:w-[min(30vw,calc(27svh*1.6))]"
        >
          <StickerLogo />
          {/* Hung under the logo (out of the flow: the logo stays centred) */}
          <div
            data-hero-cta
            className="absolute inset-x-0 top-full mt-6 flex justify-center md:mt-8"
          >
            <Link
              to="/collections/all"
              prefetch="intent"
              className="bar-cell pointer-events-auto flex h-(--bar-block) items-center gap-2 bg-ink px-5 text-xs font-bold tracking-wide whitespace-nowrap text-paper uppercase md:text-[0.8125rem]"
            >
              Shop now
              <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
