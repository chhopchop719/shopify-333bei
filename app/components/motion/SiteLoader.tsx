import {useEffect, useRef, useState} from 'react';
import {useRouteLoaderData} from 'react-router';
import type {loader as homeLoader} from '~/routes/_index';
import beanie from '~/assets/loader/333bei-zipper-beanie-1.avif';
import camoShort from '~/assets/loader/camo-short-1.avif';
import helmet from '~/assets/loader/h3lmet-tee-1.avif';
import helmetBack from '~/assets/loader/h3lmet-tee-2.avif';
import strawberry from '~/assets/loader/strawb3rry-tee-v2-1.avif';
import strawberryBack from '~/assets/loader/strawb3rry-tee-v2-2.avif';
import templeBaby from '~/assets/loader/t3mple-baby-tee-1.avif';
import temple from '~/assets/loader/t3mple-tee-1.avif';
import {getLenis} from '~/components/motion/SmoothScroll';
import {HERO_LOOK} from '~/components/hero/look';
import {HeroPhoto} from '~/components/hero/HeroPhoto';
import {CURVE_IN_OUT, CURVE_OUT, gsap, prefersReducedMotion} from '~/lib/gsap';
import {GATE_TIMER, LOADER_DONE, LOADER_MAX} from '~/lib/siteLoader';

/** Product shots, 360x504 AVIF (5:7, the product cards' ratio, at 2x). */
const FRAMES = [
  helmet,
  camoShort,
  strawberry,
  beanie,
  temple,
  helmetBack,
  templeBaby,
  strawberryBack,
];
const FLIP = 0.11; // s per frame
const MIN_SHOW = 1.3; // s: the flipbook always plays at least this long
const MAX_WAIT = 3.5; // s: don't wait longer than this for the page to load

/**
 * Site loader, on every full page load (in-app navigations use the page
 * transition instead): on ink, product shots flick through a small
 * 5:7 frame like a flipbook while a counter runs to 100. On the home page the
 * last frame is the hero photo, and the frame opens up to fill the screen,
 * becoming the hero (then the logo arrives); elsewhere the loader fades out.
 * Skipped in a background tab (LOADER_GATE in <head>, before first paint),
 * without JavaScript and with reduced motion. While it shows,
 * the page under it is inert and doesn't scroll.
 */
export function SiteLoader({isHome}: {isHome: boolean}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  const base = HERO_LOOK;
  // The hero's photo (set in Shopify): the last frame must be the same picture
  const hero = useRouteLoaderData<typeof homeLoader>('routes/_index')?.hero;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;
    // The app takes over from the <head> gate's fallback timer
    window.clearTimeout(
      (window as unknown as Record<string, number | undefined>)[GATE_TIMER],
    );
    // The page under the loader can't be reached by keyboard meanwhile
    const covered = [
      document.querySelector<HTMLElement>('[data-site-header]'),
      document.querySelector<HTMLElement>('[data-page]'),
    ].filter((el): el is HTMLElement => Boolean(el));

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      html.setAttribute('data-loaded', '');
      covered.forEach((el) => el.removeAttribute('inert'));
      getLenis()?.start();
      window.dispatchEvent(new Event(LOADER_DONE));
      setGone(true);
    };
    if (
      html.hasAttribute('data-loaded') ||
      prefersReducedMotion() ||
      document.visibilityState === 'hidden'
    ) {
      finish();
      return;
    }
    covered.forEach((el) => el.setAttribute('inert', ''));
    getLenis()?.stop();
    // Whatever goes wrong below, never keep the page covered or unscrollable
    const safety = window.setTimeout(finish, LOADER_MAX);

    const frames = [
      ...root.querySelectorAll<HTMLImageElement>('img[data-frame]'),
    ];
    const frame = root.querySelector<HTMLElement>('[data-loader-frame]');
    const count = root.querySelector<HTMLElement>('[data-loader-count]');
    if (!frame || !count) {
      finish();
      return;
    }

    // Flipbook: only moves on to frames that have loaded
    let current = 0;
    const flip = window.setInterval(() => {
      for (let step = 1; step < frames.length; step++) {
        const next = (current + step) % frames.length;
        const img = frames[next];
        if (!img.complete || img.naturalWidth === 0) continue;
        frames[current].removeAttribute('data-on');
        img.setAttribute('data-on', '');
        current = next;
        break;
      }
    }, FLIP * 1000);

    // Time already spent loading (since navigation start) counts towards the
    // minimum, so slow devices don't wait longer
    const elapsed = performance.now() / 1000;
    const progress = {value: Math.min(60, (elapsed / MIN_SHOW) * 86)};
    const show = () => {
      count.textContent = String(Math.round(progress.value)).padStart(3, '0');
    };
    show();
    const counting = gsap.to(progress, {
      value: 86,
      duration: Math.max(0.3, MIN_SHOW - elapsed),
      ease: 'none', // a progress count: linear
      onUpdate: show,
    });
    const loaded = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), {once: true});
      window.setTimeout(resolve, Math.max(0, MAX_WAIT - elapsed) * 1000);
    });
    const shown = new Promise<void>((resolve) =>
      window.setTimeout(resolve, Math.max(0, MIN_SHOW - elapsed) * 1000),
    );

    let exit: gsap.core.Timeline | null = null;
    let cancelled = false;
    void Promise.all([loaded, shown]).then(() => {
      if (cancelled) return;
      counting.kill();
      exit = gsap.timeline({onComplete: finish});
      exit.to(progress, {
        value: 100,
        duration: 0.25,
        ease: 'none',
        onUpdate: show,
      });
      exit.call(() => window.clearInterval(flip));
      exit.to(count, {opacity: 0, duration: 0.2, ease: CURVE_OUT});

      const hero = root.querySelector<HTMLElement>('[data-loader-hero]');
      const veil = root.querySelector<HTMLElement>('[data-loader-veil]');
      if (isHome && hero?.isConnected) {
        // Last frame: the hero photo, framed like the product shots (5:7,
        // cover-fitted), in a box that then grows to the real hero's size and
        // place while its ink veil comes in, and hands over to the real hero
        const r = frame.getBoundingClientRect();
        const target = document
          .querySelector<HTMLElement>('[data-hero]')
          ?.getBoundingClientRect();
        exit
          .set(
            hero,
            {
              opacity: 1,
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
            },
            '<',
          )
          .to(
            hero,
            {
              left: target?.left ?? 0,
              top: target?.top ?? 0,
              width: target?.width ?? root.clientWidth,
              height: target?.height ?? root.clientHeight,
              duration: 0.95,
              ease: CURVE_IN_OUT,
            },
            '+=0.12',
          );
        if (veil) {
          exit.fromTo(
            veil,
            {opacity: 0},
            {opacity: base.veil, duration: 0.95, ease: CURVE_IN_OUT},
            '<',
          );
        }
      } else {
        exit.to(root, {opacity: 0, duration: 0.5, ease: CURVE_OUT}, '+=0.05');
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      window.clearInterval(flip);
      counting.kill();
      exit?.kill();
      covered.forEach((el) => el.removeAttribute('inert'));
    };
    // Runs once, on the first page of the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;

  return (
    <div ref={rootRef} aria-hidden className="site-loader">
      <div className="flex flex-col items-center gap-3">
        <div data-loader-frame className="site-loader-frame">
          {FRAMES.map((src, i) => (
            <img
              key={src}
              data-frame
              data-on={i === 0 ? '' : undefined}
              src={src}
              alt=""
              width={360}
              height={504}
              // lazy: not fetched at all when the loader is skipped (hidden)
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
        <p
          data-loader-count
          className="text-xs font-bold tabular-nums text-paper/70"
        >
          000
        </p>
      </div>
      {isHome && (
        // The hero at rest (same photo, veil added as it grows), born in the frame
        <div data-loader-hero className="site-loader-hero">
          <HeroPhoto
            image={hero?.image ?? null}
            imageMobile={hero?.imageMobile ?? null}
          />
          <div
            data-loader-veil
            className="absolute inset-0 bg-ink"
            style={{opacity: 0}}
          />
        </div>
      )}
    </div>
  );
}
