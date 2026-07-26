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
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>

      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
