import type { ReactNode } from 'react';

/**
 * The one `<h1>` of a page, with an optional line of context and the actions
 * that belong to the whole screen.
 */
export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  // A plain `div`, not a `header`: this sits inside `<main>`, and a second
  // banner landmark there only adds noise for a screen-reader user.
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>

      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
