import fallbackUrl from '~/assets/hero-casquettes.avif';
import {HERO_LOOK} from './look';

export type HeroImage = {url: string; width?: number | null};

/** Widths offered to the browser (never more than the original's). */
const WIDTHS = [640, 960, 1280, 1600, 2000, 2560, 3200];

function sized(url: string, width: number) {
  const next = new URL(url);
  next.searchParams.set('width', String(width));
  return next.toString();
}

function srcSet(image: HeroImage) {
  const largest = WIDTHS[WIDTHS.length - 1];
  const max = Math.min(image.width ?? largest, largest);
  return [...WIDTHS.filter((width) => width < max), max]
    .map((width) => `${sized(image.url, width)} ${width}w`)
    .join(', ');
}

/**
 * The hero photo, cover-fitted in its (positioned) box: the Shopify
 * "Accueil — hero" entry's image (portrait variant on phones if there is one),
 * or the bundled caps shot. Shared by the hero and the site loader's last
 * frame, which grows into it: both must show the very same picture.
 */
export function HeroPhoto({
  image,
  imageMobile,
}: {
  image: HeroImage | null;
  imageMobile: HeroImage | null;
}) {
  const props = {
    className: 'absolute inset-0 size-full object-cover',
    style: {filter: `saturate(${HERO_LOOK.saturation})`},
    decoding: 'async' as const,
    // the page's main picture (React 18 doesn't know the camelCase prop)
    ...{fetchpriority: 'high'},
  };

  if (!image) return <img src={fallbackUrl} alt="" {...props} />;

  return (
    <picture>
      {imageMobile && (
        <source
          media="(max-width: 47.99rem)"
          srcSet={srcSet(imageMobile)}
          sizes="100vw"
        />
      )}
      <img
        src={sized(image.url, 1600)}
        srcSet={srcSet(image)}
        sizes="100vw"
        alt=""
        {...props}
      />
    </picture>
  );
}
