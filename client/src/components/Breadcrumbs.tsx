import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  /** The last crumb is the current page and therefore has no link. */
  to?: string;
}

/**
 * Where the current page sits. Each page passes its own trail, because only the
 * page knows the real names behind the ids in the URL.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            <li>
              {item.to ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
