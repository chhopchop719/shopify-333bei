import * as React from 'react';
import {Pagination} from '@shopify/hydrogen';

const moreLink =
  'mx-auto flex h-12 w-fit items-center border-[1.5px] border-ink px-8 text-sm font-bold transition-colors duration-200 hover:bg-ink hover:text-paper';

/**
 * Paginated list with "show more" / "show previous" links (Hydrogen Pagination:
 * next pages are appended, the URL keeps other params such as ?sort).
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
  nextLabel = 'Afficher plus',
  previousLabel = 'Afficher les précédents',
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: React.FunctionComponent<{node: NodesType; index: number}>;
  ariaLabel?: string;
  resourcesClassName?: string;
  /** e.g. "Afficher plus de produits" */
  nextLabel?: string;
  previousLabel?: string;
}) {
  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink}) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div>
            <PreviousLink className={`${moreLink} mb-10`}>
              {isLoading ? 'Chargement…' : previousLabel}
            </PreviousLink>
            {resourcesClassName ? (
              <div
                aria-label={ariaLabel}
                className={resourcesClassName}
                role={ariaLabel ? 'region' : undefined}
              >
                {resourcesMarkup}
              </div>
            ) : (
              resourcesMarkup
            )}
            <NextLink className={moreLink}>
              {isLoading ? 'Chargement…' : nextLabel}
            </NextLink>
          </div>
        );
      }}
    </Pagination>
  );
}
