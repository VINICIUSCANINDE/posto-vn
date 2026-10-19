import type { ReactNode } from 'react';

export function Toolbar({ children, actions, label = 'Filtros e ações' }: { children?: ReactNode; actions?: ReactNode; label?: string }) {
  return (
    <div className="toolbar" aria-label={label} role="group">
      {children && <div className="toolbar-filters">{children}</div>}
      {actions && <div className="toolbar-actions">{actions}</div>}
    </div>
  );
}
