import {gsap} from 'gsap';
import {CustomEase} from 'gsap/CustomEase';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {SplitText} from 'gsap/SplitText';
import {useGSAP} from '@gsap/react';

// Register once, client side only (GSAP must not run during SSR).
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);
  // The project's motion curves (same as --ease-out / --ease-in-out in tailwind.css)
  CustomEase.create('ui-out', '0.23,1,0.32,1');
  CustomEase.create('ui-in-out', '0.77,0,0.175,1');
}

/** cubic-bezier(0.23, 1, 0.32, 1), = --ease-out: entering / exiting. */
export const CURVE_OUT = 'ui-out';
/** cubic-bezier(0.77, 0, 0.175, 1), = --ease-in-out: moving on screen. */
export const CURVE_IN_OUT = 'ui-in-out';

/** Strong ease-out used for entrances (animate skill: --ease-out). */
export const EASE_OUT = 'expo.out';

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export {gsap, ScrollTrigger, SplitText, useGSAP};
