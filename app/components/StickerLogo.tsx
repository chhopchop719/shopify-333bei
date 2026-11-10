import {Logo} from '~/components/Logo';
import {cn} from '~/lib/utils';

/**
 * The "mmm" mark as placed on the hero. Animate `[data-sticker]` (the whole
 * mark) and `[data-sticker-mark]` (the logo itself). Decorative: wrap it in
 * something labelled.
 */
export function StickerLogo({className}: {className?: string}) {
  return (
    <div data-sticker aria-hidden className={cn('relative', className)}>
      <div data-sticker-mark className="sticker-mark">
        <Logo className="h-auto w-full" />
      </div>
    </div>
  );
}
