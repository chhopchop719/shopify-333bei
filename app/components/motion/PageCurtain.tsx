import {useCallback, useEffect, useRef} from 'react';
import {
  useBlocker,
  useLocation,
  useNavigation,
  type BlockerFunction,
} from 'react-router';
import {
  createTransition,
  type Transition,
} from '~/components/motion/transitions';
import {gsap, prefersReducedMotion} from '~/lib/gsap';

/*
 * Page transitions. The look comes from `./transitions` ("Zoom": the page
 * steps back and fades, the new one arrives and settles); the mechanics are here:
 * - a navigation to another page is held (useBlocker) until the transition has
 *   covered the old page, then let through;
 * - once the new page has rendered, the transition reveals it;
 * - from a product card to its product page, the card's photo is lifted above
 *   the transition, then flies to the exact place of the main photo in the
 *   product gallery while the new page is revealed, and hands over to it.
 * Same-page navigations (sort, variant, search params) and reduced motion
 * don't trigger anything.
 */

const FLIGHT = 0.85; // card photo → product gallery
const WATCHDOG = 10_000; // ms: never leave the page covered

type Flight = {
  box: HTMLDivElement;
  main: HTMLImageElement;
  swap: HTMLImageElement | null;
};

type Run = {
  intro: gsap.core.Timeline;
  outro: gsap.core.Timeline | null;
  transition: Transition;
  path: string;
  flight: Flight | null;
  hidden: HTMLElement | null; // gallery frame hidden while the photo lands
  proceeded: boolean; // navigation let through (old page covered)
  ready: boolean; // new page rendered
  held: boolean; // cover done, waiting for the new page
  leaving: boolean;
  watchdog: number;
};

/** Resolves once the image can be shown (or after a short timeout). */
function whenLoaded(img: HTMLImageElement | null) {
  if (!img || (img.complete && img.naturalWidth > 0)) return Promise.resolve();
  return Promise.race([
    img.decode().catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 1200)),
  ]);
}

export function PageCurtain() {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<Run | null>(null);
  const clickRef = useRef({
    x: 0,
    y: 0,
    frame: null as HTMLElement | null,
    path: null as string | null,
    at: 0,
  });
  const navigation = useNavigation();
  const location = useLocation();

  // Hold every navigation to another page until the old one is covered
  const shouldBlock = useCallback<BlockerFunction>(
    ({currentLocation, nextLocation}) =>
      currentLocation.pathname !== nextLocation.pathname &&
      !prefersReducedMotion(),
    [],
  );
  const blocker = useBlocker(shouldBlock);
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const letThrough = () => {
    const current = blockerRef.current;
    if (current.state === 'blocked') current.proceed();
  };

  // Remember where the visitor pressed, and which product card (if any)
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      const link = (
        event.target as Element | null
      )?.closest?.<HTMLAnchorElement>('a[href]');
      const frame =
        link?.querySelector<HTMLElement>('[data-card-frame]') ?? null;
      clickRef.current = {
        x: event.clientX,
        y: event.clientY,
        frame,
        path: frame && link ? link.pathname : null,
        at: performance.now(),
      };
    };
    window.addEventListener('pointerdown', onDown, {
      capture: true,
      passive: true,
    });
    return () =>
      window.removeEventListener('pointerdown', onDown, {capture: true});
  }, []);

  const reset = () => {
    const run = runRef.current;
    runRef.current = null;
    if (run) {
      run.intro.kill();
      run.outro?.kill();
      window.clearTimeout(run.watchdog);
      run.transition.dispose();
      run.flight?.box.remove();
      if (run.hidden) run.hidden.style.visibility = '';
    }
    layerRef.current?.replaceChildren();
    rootRef.current?.removeAttribute('data-on');
  };

  /** Copy of the pressed card's photo (and its hover photo, if showing), above the transition. */
  const liftCardPhoto = (root: HTMLElement, pathname: string) => {
    const click = clickRef.current;
    const frame = click.frame;
    if (
      !frame?.isConnected ||
      click.path !== pathname ||
      performance.now() - click.at > 1500
    ) {
      return null;
    }
    const main = frame.querySelector<HTMLImageElement>('img:not(.card-swap)');
    const rect = frame.getBoundingClientRect();
    if (!main || !rect.width || !rect.height) return null;

    const box = document.createElement('div');
    box.className = 'curtain-flight';
    Object.assign(box.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    const copy = (img: HTMLImageElement) => {
      const clone = document.createElement('img');
      clone.src = img.currentSrc || img.src;
      clone.alt = '';
      box.append(clone);
      return clone;
    };
    // Same look as on the card (sold out = faded, greyed); restored in flight
    const mainCopy = copy(main);
    const look = getComputedStyle(main);
    mainCopy.style.opacity = look.opacity;
    if (look.filter !== 'none') mainCopy.style.filter = look.filter;
    let swap: HTMLImageElement | null = null;
    const hover = frame.querySelector<HTMLImageElement>('img.card-swap');
    const hoverOpacity = hover ? Number(getComputedStyle(hover).opacity) : 0;
    if (hover && hoverOpacity > 0.01) {
      swap = copy(hover);
      swap.style.opacity = String(hoverOpacity);
    }
    root.append(box);
    return {box, main: mainCopy, swap};
  };

  /** Starts the transition; false if it can't run (the caller lets the page through). */
  const play = (pathname: string) => {
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return false;
    reset();
    root.setAttribute('data-on', '');

    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.innerHeight;
    const click = clickRef.current;
    const recentClick = performance.now() - click.at < 1500;
    const transition = createTransition({
      layer,
      page: document.querySelector<HTMLElement>('[data-page]'),
      width,
      height,
      origin: recentClick
        ? {x: click.x, y: click.y}
        : {x: width / 2, y: height / 2},
    });
    const flight = liftCardPhoto(root, pathname);

    const intro = gsap.timeline();
    const run: Run = {
      intro,
      outro: null,
      transition,
      path: pathname,
      flight,
      hidden: null,
      proceeded: false,
      ready: false,
      held: false,
      leaving: false,
      watchdog: 0,
    };
    const covered = transition.cover(intro);
    // Old page covered: let the navigation through, then wait for the new one
    intro.call(
      () => {
        if (runRef.current !== run) return;
        run.proceeded = true;
        letThrough();
      },
      [],
      covered,
    );
    intro.call(
      () => {
        if (runRef.current !== run) return;
        run.held = true;
        if (run.ready) leave(run);
      },
      [],
      covered + 0.02,
    );
    run.watchdog = window.setTimeout(() => {
      if (runRef.current !== run) return;
      letThrough();
      reset();
    }, WATCHDOG);
    runRef.current = run;
    return true;
  };

  /** New page on screen: reveal it (and land the card photo, if any). */
  const leave = (run: Run) => {
    if (runRef.current !== run || run.leaving) return;
    run.leaving = true;
    const {transition} = run;
    const outro = gsap.timeline({onComplete: reset});
    run.outro = outro;
    const center = {x: window.innerWidth / 2, y: window.innerHeight / 2};

    // New page at its final size and place before measuring anything on it
    transition.settle?.();
    const target = run.flight
      ? document.querySelector<HTMLElement>('[data-gallery-slide]')
      : null;
    const rect = target?.getBoundingClientRect();

    if (run.flight && target && rect?.width && rect.height) {
      const {box, main, swap} = run.flight;
      // The real frame stays hidden until the flying photo lands on it
      target.style.visibility = 'hidden';
      run.hidden = target;
      outro.to(
        box,
        {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          duration: FLIGHT,
          ease: 'power3.inOut',
        },
        0,
      );
      if (main.style.opacity !== '1' || main.style.filter) {
        const restore: gsap.TweenVars = {
          opacity: 1,
          duration: FLIGHT * 0.6,
          ease: 'power1.inOut',
        };
        if (main.style.filter) restore.filter = 'grayscale(0)';
        outro.to(main, restore, 0);
      }
      if (swap) {
        outro.to(
          swap,
          {opacity: 0, duration: FLIGHT * 0.6, ease: 'power1.inOut'},
          0,
        );
      }
      // The page opens around where the photo lands, done by the time it lands
      transition.reveal(
        outro,
        Math.max(0, FLIGHT - transition.revealDuration - 0.05),
        {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2},
      );
      // Landed: show the real frame, wait for its photo, then drop the copy
      outro.call(
        () => {
          target.style.visibility = '';
          run.hidden = null;
          const img = target.querySelector('img');
          if (img?.complete && img.naturalWidth > 0) return;
          outro.pause();
          void whenLoaded(img).then(() => {
            if (runRef.current === run) outro.play();
          });
        },
        [],
        Math.max(FLIGHT, transition.revealDuration),
      );
      outro.to(
        box,
        {opacity: 0, duration: 0.2, ease: 'power1.out'},
        Math.max(FLIGHT, transition.revealDuration),
      );
    } else {
      if (run.flight) {
        // No gallery to land on: the photo just fades as the page shows
        outro.to(
          run.flight.box,
          {opacity: 0, scale: 1.04, duration: 0.3, ease: 'power2.in'},
          0,
        );
      }
      transition.reveal(outro, 0, center);
    }
  };

  const arrive = () => {
    const run = runRef.current;
    if (!run || !run.proceeded || run.ready) return;
    run.ready = true;
    // Already covered and waiting: give the new page one beat to paint
    if (run.held) gsap.delayedCall(0.05, () => leave(run));
  };

  // Navigation to another page blocked: cover the page, then let it through.
  // Another click while covering just updates the blocker (the transition
  // carries on and lets the latest destination through), unless a card photo
  // is flying to the first destination: then it restarts.
  const blockedPath =
    blocker.state === 'blocked' ? blocker.location.pathname : null;
  useEffect(() => {
    if (!blockedPath) return;
    const run = runRef.current;
    if (run && !run.proceeded && (run.path === blockedPath || !run.flight)) {
      return;
    }
    if (!play(blockedPath)) letThrough();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedPath]);

  // Navigation settled (new page rendered, or cancelled): reveal it
  useEffect(() => {
    if (navigation.state === 'idle') arrive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation.state, location.key]);

  // Unmount: never leave a navigation blocked or the page covered
  useEffect(
    () => () => {
      letThrough();
      reset();
    },

    [],
  );

  return (
    <div ref={rootRef} aria-hidden className="page-curtain">
      <div ref={layerRef} className="curtain-layer" />
    </div>
  );
}
