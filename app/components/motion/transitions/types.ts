import type {gsap} from '~/lib/gsap';

/** What a transition gets to work with, measured when it starts. */
export type Stage = {
  /** Empty full-screen container (fixed, above the page, under the header) for the transition's own elements. */
  layer: HTMLElement;
  /** The page content (main + footer), `[data-page]`; null if missing. */
  page: HTMLElement | null;
  width: number;
  height: number;
  /** Where the visitor pressed, or the centre of the screen. */
  origin: {x: number; y: number};
};

/**
 * One page transition. PageCurtain holds the navigation until `cover` says the
 * old page is hidden, lets it through, waits for the new page, then `reveal`s it.
 */
export type Transition = {
  /** Adds the cover-up to `tl` from 0; returns the time at which the old page is hidden. */
  cover(tl: gsap.core.Timeline): number;
  /**
   * Optional: put the (still hidden) new page back at its final size and
   * place, so what's on it can be measured before `reveal` (product photo landing).
   */
  settle?(): void;
  /** How long `reveal` takes, so it can end with a flying product photo. */
  revealDuration: number;
  /** Adds the reveal to `tl` at `at`, opening from `from` (viewport px). */
  reveal(
    tl: gsap.core.Timeline,
    at: number,
    from: {x: number; y: number},
  ): void;
  /** Removes whatever it left on the page (inline styles). Its layer is emptied for it. */
  dispose(): void;
};

export type TransitionFactory = (stage: Stage) => Transition;
