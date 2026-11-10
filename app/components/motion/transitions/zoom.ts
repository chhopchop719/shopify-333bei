import {gsap} from '~/lib/gsap';
import {fade} from './fade';
import type {TransitionFactory} from './types';

const OUT = 0.38;
const IN = 0.6;

/**
 * "Zoom": no overlay. The page itself steps back (scales down a little) and
 * fades into the paper; the new one arrives from very slightly closer and
 * settles. The header stays put.
 */
export const zoom: TransitionFactory = (stage) => {
  const {page, height} = stage;
  if (!page) return fade(stage);
  return {
    cover(tl) {
      tl.to(
        page,
        {
          opacity: 0,
          scale: 0.965,
          // around the middle of what's on screen, not of the whole page
          transformOrigin: `50% ${window.scrollY + height / 2}px`,
          duration: OUT,
          ease: 'power2.in',
        },
        0,
      );
      return OUT;
    },
    settle() {
      gsap.set(page, {scale: 1});
    },
    revealDuration: IN,
    reveal(tl, at) {
      tl.fromTo(
        page,
        {opacity: 0, scale: 1.025, transformOrigin: `50% ${height / 2}px`},
        {opacity: 1, scale: 1, duration: IN, ease: 'power3.out'},
        at,
      );
    },
    dispose() {
      gsap.set(page, {clearProps: 'opacity,transform,transformOrigin'});
    },
  };
};
