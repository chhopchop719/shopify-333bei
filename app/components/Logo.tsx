import logoUrl from '~/assets/logo.svg';
import {cn} from '~/lib/utils';

/** 333bei mark: orange "mmm" with butter outline. Decorative: wrap in a labelled link. */
export function Logo({className}: {className?: string}) {
  return (
    <img
      src={logoUrl}
      alt=""
      width={1343}
      height={839}
      className={cn('select-none', className)}
      draggable={false}
    />
  );
}
