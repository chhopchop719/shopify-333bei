import {useEffect, useRef, useState} from 'react';
import {Image} from '@shopify/hydrogen';
import type {ProductVariantFragment} from 'storefrontapi.generated';

type GalleryImage = NonNullable<ProductVariantFragment['image']>;

function frameRatio(image: GalleryImage) {
  return image.width && image.height
    ? `${image.width} / ${image.height}`
    : '3 / 4';
}

/**
 * Product gallery. Every frame has its photo's own proportions (shown whole,
 * no letterboxing) and is sized so it fits the viewport height under the header.
 * Desktop: two photos per row. Mobile: horizontal scroll-snap strip with a
 * "1 / N" counter.
 */
export function ProductImage({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const slide = track.firstElementChild as HTMLElement | null;
      if (!slide) return;
      const step = slide.offsetWidth + 8; // gap-2
      setIndex(Math.round(track.scrollLeft / step));
    };
    track.addEventListener('scroll', onScroll, {passive: true});
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  if (!images.length) {
    return (
      <div
        className="product-frame bg-concrete"
        style={{aspectRatio: '3 / 4'}}
      />
    );
  }

  return (
    // Phones and tablets: the strip runs to the screen edges (the page's
    // gutter given back inside); lg: a grid in its column
    <div className="relative -mx-(--gutter) lg:mx-0">
      <div
        ref={trackRef}
        className="product-gallery flex items-start snap-x snap-mandatory scroll-px-(--gutter) gap-2 overflow-x-auto px-(--gutter) [scrollbar-width:none] lg:snap-none lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
        aria-label={`Photos de ${title}`}
        role="region"
      >
        {images.map((image, i) => (
          <figure
            key={image.id ?? i}
            data-gallery-slide
            className="product-frame shrink-0 snap-start overflow-hidden bg-concrete"
            // the frame takes the photo's own proportions: no bands, no crop
            style={{aspectRatio: frameRatio(image)}}
          >
            <Image
              alt={image.altText || `${title}, photo ${i + 1}`}
              data={image}
              loading={i === 0 ? 'eager' : 'lazy'}
              sizes="(min-width: 64rem) 30vw, (min-width: 48rem) 62vw, 85vw"
              className="size-full object-cover"
            />
          </figure>
        ))}
      </div>
      {images.length > 1 && (
        <p
          className="mt-3 px-(--gutter) text-xs tabular-nums text-muted-foreground lg:hidden"
          aria-live="polite"
        >
          {Math.min(index + 1, images.length)} / {images.length}
        </p>
      )}
    </div>
  );
}
