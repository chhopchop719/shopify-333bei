import type {TransitionFactory} from './types';

/** Fallback: a paper sheet fades up, then away. */
export const fade: TransitionFactory = ({layer}) => {
  const sheet = document.createElement('div');
  sheet.className = 'curtain-fill';
  layer.append(sheet);
  return {
    cover(tl) {
      tl.fromTo(
        sheet,
        {opacity: 0},
        {opacity: 1, duration: 0.35, ease: 'power2.out'},
        0,
      );
      return 0.35;
    },
    revealDuration: 0.4,
    reveal(tl, at) {
      tl.to(sheet, {opacity: 0, duration: 0.4, ease: 'power2.inOut'}, at);
    },
    dispose() {},
  };
};
