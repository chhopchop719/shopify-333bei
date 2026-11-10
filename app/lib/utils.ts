import {clsx, type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * True for the home page only. No locale-prefixed routes exist (yet), so a
 * path like "/fr-ca" is a 404, not a localized home: it must get the regular
 * header and spacer. Add the localized roots here once markets are routed.
 */
export function isHomePath(pathname: string) {
  return pathname === '/';
}
