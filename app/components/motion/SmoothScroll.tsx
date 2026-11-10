import {useEffect} from 'react';
import {useLocation} from 'react-router';
import Lenis from 'lenis';
import {gsap, prefersReducedMotion, ScrollTrigger} from '~/lib/gsap';
import {useAside} from '~/components/Aside';

let lenis: Lenis | null = null;

/** The running Lenis instance (null on the server, with reduced motion, or before mount). */
export function getLenis() {
  return lenis;
}

/**
 * Inertia scrolling driven by GSAP's ticker so ScrollTrigger stays in sync.
 * Paused while a side panel is open; jumps to top on route change.
 */
export function SmoothScroll() {
  const {pathname} = useLocation();
  const {type: asideType} = useAside();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const instance = new Lenis({lerp: 0.1, wheelMultiplier: 1, autoRaf: false});
    lenis = instance;
    instance.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      lenis = null;
    };
  }, []);

  useEffect(() => {
    if (asideType === 'closed') lenis?.start();
    else lenis?.stop();
  }, [asideType]);

  useEffect(() => {
    // Arriving on /page#section lands on that section, otherwise at the top
    const target = hashTarget(window.location.hash);
    if (target) {
      if (lenis) lenis.scrollTo(target, {immediate: true});
      else target.scrollIntoView({block: 'start'});
    } else {
      lenis?.scrollTo(0, {immediate: true});
    }
    // New page content: recompute trigger positions once it has laid out
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  // In-page links (#section, e.g. a table of contents) are scrolled here.
  // Left to the browser, the jump becomes a router POP navigation whose scroll
  // restoration (every such entry shares the "default" key) and Lenis' own
  // target can pull the page back: the link then works only some of the time.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') {
        return;
      }
      const url = new URL(link.href);
      const here = window.location;
      if (
        !url.hash ||
        url.origin !== here.origin ||
        url.pathname !== here.pathname ||
        url.search !== here.search
      ) {
        return;
      }
      const target = hashTarget(url.hash);
      if (!target) return;
      event.preventDefault();
      // Shareable URL without a router navigation (keeps React Router's state)
      window.history.replaceState(window.history.state, '', url.hash);
      if (lenis) lenis.scrollTo(target);
      else target.scrollIntoView({block: 'start'});
      // Keyboard and screen-reader users continue from the section
      if (!target.hasAttribute('tabindex'))
        target.setAttribute('tabindex', '-1');
      target.focus({preventScroll: true});
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}

/** Element a "#id" hash points to (scroll-margin-top keeps it below the header). */
function hashTarget(hash: string) {
  if (hash.length < 2) return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}
