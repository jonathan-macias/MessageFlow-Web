import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Migas de pan semánticas (<nav> + lista ordenada); el último elemento es la página actual. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const all: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...items];

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-subtle">
      <ol className="flex flex-wrap items-center gap-1.5">
        {all.map((item, i) => {
          const last = i === all.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="min-w-0">
                {item.href && !last ? (
                  <Link href={item.href} className="rounded transition-colors hover:text-fg">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className={last ? "font-medium text-fg" : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden="true" className="text-line-strong">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
