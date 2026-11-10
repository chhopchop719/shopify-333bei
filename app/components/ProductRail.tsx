import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import type {RecommendedProductFragment} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '~/components/ui/carousel';
import {cn} from '~/lib/utils';

const arrow =
  'static size-10 translate-y-0 rounded-none border-[1.5px] border-ink bg-transparent shadow-none hover:bg-ink hover:text-paper disabled:border-ink/20 disabled:text-ink/25 disabled:opacity-100';

/**
 * Horizontal product rail on shadcn's Carousel (Embla).
 * - header: title + count on the left, square prev/next arrows on the right
 * - fractional slide widths: the last visible card is cut by the edge ("more →")
 * - drag/swipe/trackpad + keyboard arrows come from Embla
 * - a progress bar under the cards mirrors the scroll position
 */
export function ProductRail({
  id,
  title,
  href,
  products,
  className,
}: {
  id: string;
  title: string;
  href: string;
  products: RecommendedProductFragment[];
  /** e.g. `site-gutter` where the page itself is full-bleed (home) */
  className?: string;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [progress, setProgress] = useState(0);
  const [scrollable, setScrollable] = useState(true);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setProgress(Math.max(0, Math.min(1, api.scrollProgress())));
      setScrollable(api.canScrollPrev() || api.canScrollNext());
    };
    update();
    api.on('scroll', update).on('reInit', update);
    return () => {
      api.off('scroll', update).off('reInit', update);
    };
  }, [api]);

  return (
    <section aria-labelledby={id} className={cn('mt-16 md:mt-24', className)}>
      <Carousel
        setApi={setApi}
        opts={{align: 'start', dragFree: true, containScroll: 'trimSnaps'}}
        aria-label={title}
      >
        <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
          <div className="flex items-baseline gap-3">
            <h2
              id={id}
              className="text-2xl leading-none font-extrabold tracking-tight md:text-4xl"
            >
              <Link to={href} prefetch="intent" className="hover:text-orange">
                {title}
              </Link>
            </h2>
            <span className="text-xs text-muted-foreground">
              {products.length} pièce{products.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={href}
              prefetch="intent"
              className="mr-2 hidden text-xs underline underline-offset-4 hover:text-orange sm:block"
            >
              Tout voir
            </Link>
            <CarouselPrevious className={arrow} />
            <CarouselNext className={arrow} />
          </div>
        </div>

        <CarouselContent className="-ml-2 cursor-grab active:cursor-grabbing md:-ml-3">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-[62%] pl-2 md:basis-[30%] md:pl-3 xl:basis-[23.2%]"
            >
              <ProductItem product={product} loading="lazy" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div
        aria-hidden
        className={cn('mt-6 h-0.5 bg-ink/10', !scrollable && 'invisible')}
      >
        <div
          className="h-full origin-left bg-ink"
          style={{transform: `scaleX(${Math.max(progress, 0.08)})`}}
        />
      </div>
    </section>
  );
}
