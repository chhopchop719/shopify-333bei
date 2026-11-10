import {useRef} from 'react';
import {CURVE_OUT, gsap, SplitText, useGSAP} from '~/lib/gsap';
import {onSiteLoaded} from '~/lib/siteLoader';
import {cn} from '~/lib/utils';

/**
 * Big page title whose letters rise out of a mask on load.
 * Screen readers get the plain text (SplitText adds aria labels).
 */
export function RevealTitle({
  children,
  className,
  as: Tag = 'h1',
}: {
  children: string;
  className?: string;
  as?: 'h1' | 'h2';
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const split = SplitText.create(ref.current, {
          type: 'chars,lines',
          mask: 'lines',
          // masks get "reveal-line-mask": room for accents and descenders (tailwind.css)
          linesClass: 'reveal-line',
          aria: 'auto',
        });
        const reveal = gsap.from(split.chars, {
          yPercent: 130, // fully below the mask's extra bottom room
          duration: 1,
          ease: CURVE_OUT,
          stagger: 0.025,
          paused: true,
        });
        // After the site loader, if it's showing (right away otherwise)
        const cancel = onSiteLoaded(() => {
          reveal.play();
        });
        return () => {
          cancel();
          split.revert();
        };
      });
    },
    {scope: ref, dependencies: [children], revertOnUpdate: true},
  );

  return (
    <Tag
      ref={ref}
      className={cn(
        // size comes from the caller (catalogue, contact, product, cart… differ)
        'leading-[0.9] font-extrabold tracking-tight uppercase',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
