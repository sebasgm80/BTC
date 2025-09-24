import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import { usePriceData } from '../context/PriceContext';

export function Layout({ children }: { children: ReactNode }) {
  const { toast, dismissToast } = usePriceData();

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">{children}</main>
      <AppFooter />
      {toast ? (
        <div
          className="app-toast"
          role="status"
          aria-live="polite"
          onClick={dismissToast}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
