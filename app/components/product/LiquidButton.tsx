import * as React from 'react';
import {cn} from '~/lib/utils';

/**
 * Full-width ink button whose hover fills with butter from the bottom,
 * like liquid rising; the label flips to ink. Works as <button> or <a>.
 * Hover motion is gated to fine pointers; reduced motion keeps only the colour change.
 */
const base =
  'group/liquid relative isolate inline-flex h-14 w-full items-center justify-center overflow-hidden bg-ink px-6 text-xs font-bold uppercase text-paper transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:bg-concrete disabled:text-muted-foreground aria-disabled:pointer-events-none aria-disabled:bg-concrete aria-disabled:text-muted-foreground';

function Fill() {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 -bottom-[12%] -z-10 h-[124%] translate-y-full bg-butter',
        // wavy liquid top edge
        '[clip-path:polygon(0_8%,10%_4%,22%_9%,35%_3%,48%_8%,62%_2%,76%_7%,88%_3%,100%_8%,100%_100%,0_100%)]',
        'transition-transform duration-500 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
        'motion-reduce:hidden',
        '[@media(hover:hover)_and_(pointer:fine)]:group-hover/liquid:translate-y-0',
        'group-focus-visible/liquid:translate-y-0',
        'group-disabled/liquid:hidden group-aria-disabled/liquid:hidden',
      )}
    />
  );
}

const labelClass =
  'relative transition-colors duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover/liquid:text-ink group-focus-visible/liquid:text-ink group-disabled/liquid:text-muted-foreground motion-reduce:group-hover/liquid:text-ink';

export const LiquidButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function LiquidButton({className, children, type = 'button', ...props}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, 'motion-reduce:hover:bg-butter', className)}
      {...props}
    >
      <Fill />
      <span className={labelClass}>{children}</span>
    </button>
  );
});

export const LiquidLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(function LiquidLink({className, children, ...props}, ref) {
  return (
    <a
      ref={ref}
      className={cn(base, 'motion-reduce:hover:bg-butter', className)}
      {...props}
    >
      <Fill />
      <span className={labelClass}>{children}</span>
    </a>
  );
});
