import firstFrame from '~/assets/loader/h3lmet-tee-1.avif';

/*
 * Site loader handshake (see SiteLoader.tsx). The loader plays on every full
 * page load (not on in-app navigations); when it's gone or skipped, <html>
 * gets `data-loaded` and LOADER_DONE fires.
 */

export const LOADER_DONE = '333bei:loader-done';
/** Never keep the loader longer than this, whatever happens (ms). */
export const LOADER_MAX = 6000;
/** Global holding the <head> gate's fallback timer, cleared once the app takes over. */
export const GATE_TIMER = '__333beiLoaderGate';

/**
 * Inline <head> script (runs before first paint):
 * - tab in the background: skip the loader (nobody would see it);
 * - otherwise preload its first frame, and arm a fallback that hides it if the
 *   app never takes over (SiteLoader clears that timer and keeps its own).
 */
export const LOADER_GATE = `(function(){var h=document.documentElement;function done(){h.setAttribute('data-loaded','')}if(document.visibilityState==='hidden'){done();return}var l=document.createElement('link');l.rel='preload';l.as='image';l.href='${firstFrame}';l.setAttribute('fetchpriority','high');document.head.appendChild(l);window.${GATE_TIMER}=setTimeout(done,${LOADER_MAX})})();`;

/** Calls back once the loader is gone (right away if there's none). Returns a cancel. */
export function onSiteLoaded(callback: () => void) {
  if (typeof document === 'undefined') return () => {};
  let called = false;
  // Declared before run(): run() may be called right away, below
  let timer = 0;
  const run = () => {
    if (called) return;
    called = true;
    window.removeEventListener(LOADER_DONE, run);
    window.clearTimeout(timer);
    callback();
  };
  if (document.documentElement.hasAttribute('data-loaded')) {
    run();
    return () => {};
  }
  window.addEventListener(LOADER_DONE, run);
  timer = window.setTimeout(run, LOADER_MAX);
  return () => {
    called = true;
    window.removeEventListener(LOADER_DONE, run);
    window.clearTimeout(timer);
  };
}
