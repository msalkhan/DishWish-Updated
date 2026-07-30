import { useEffect, useState } from 'react';
import { TableProvider, useTable } from '@/context/TableContext';
import { OrderProvider, useOrderContext } from '@/context/OrderContext';
import { ToastProvider } from '@/components/ui/Toast';
import { RestaurantProvider, useRestaurant } from '@/context/RestaurantContext';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { BottomNav, type Route } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { Dashboard } from '@/screens/Dashboard';
import { Menu } from '@/screens/Menu';
import { OrderConfirmation } from '@/screens/OrderConfirmation';
import { Payment } from '@/screens/Payment';
import { AdminApp } from '@/screens/admin/AdminApp';
import { Blob, GoldDot } from '@/components/brand/Blob';

type Surface = 'customer' | 'admin';

function useSurface(): Surface {
  const [surface, setSurface] = useState<Surface>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/admin') ? 'admin' : 'customer';
    }
    return 'customer';
  });

  useEffect(() => {
    const checkSurface = () => {
      const isAdmin = window.location.pathname.startsWith('/admin');
      setSurface((prev) => {
        const next = isAdmin ? 'admin' : 'customer';
        return prev !== next ? next : prev;
      });
    };

    window.addEventListener('popstate', checkSurface);
    window.addEventListener('hashchange', checkSurface);
    const interval = setInterval(checkSurface, 300);

    return () => {
      window.removeEventListener('popstate', checkSurface);
      window.removeEventListener('hashchange', checkSurface);
      clearInterval(interval);
    };
  }, []);

  return surface;
}

function AppShell() {
  const [route, setRoute] = useState<Route>('home');
  const { tableNumber, loading } = useTable();
  const { restaurant } = useRestaurant();
  const { itemCount, total } = useOrderContext();

  const navigate = (r: Route) => setRoute(r);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream-100">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full bg-gold-300/40" />
          <p className="tracked-label text-[11px] text-gold-600">Dishwish</p>
        </div>
      </div>
    );
  }

  const needsTable = !tableNumber && route !== 'home';
  const topBarVariant = route === 'home' ? 'ghost' : 'solid';

  return (
    <div className="min-h-screen bg-cream-100">
      <TopBar variant={topBarVariant} onHome={() => navigate('home')} />

      <div className="relative">
        {route === 'home' && <Dashboard onNavigate={navigate} />}
        {route === 'menu' && <Menu onNavigate={navigate} />}
        {route === 'order' && <OrderConfirmation onNavigate={navigate} />}
        {route === 'pay' && <Payment onNavigate={navigate} />}
      </div>

      {needsTable && (
        <div className="fixed inset-0 z-[55] grid place-items-center bg-cream-100/90 px-6 backdrop-blur-sm animate-fadeIn">
          <div className="relative max-w-sm rounded-3xl border border-gold-300/30 bg-cream-50 p-7 text-center shadow-lifted">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 text-cream-200/70">
              <Blob variant="a" className="h-full w-full" />
            </div>
            <div className="relative">
              <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                <GoldDot className="bg-coral-300" />
                <span className="tracked-label text-[10px] text-gold-600">{restaurant?.name ?? 'Dishwish'}</span>
              </div>
              <h1 className="font-display text-[24px] font-medium leading-tight text-ink-600">
                Choose a table to begin
              </h1>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-400">
                Pick your table from the home screen to unlock the menu, order, and payment.
              </p>
              <button onClick={() => navigate('home')} className="btn-primary mt-5">
                Go to home
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav route={route} onNavigate={navigate} orderBadge={itemCount} payBadge={total > 0} />
    </div>
  );
}

function CustomerApp() {
  const { tableNumber } = useTable();
  const { restaurant } = useRestaurant();
  return (
    <OrderProvider tableNumber={tableNumber} restaurantId={restaurant?.id ?? null}>
      <AppShell />
    </OrderProvider>
  );
}

export default function App() {
  const surface = useSurface();

  if (surface === 'admin') {
    return (
      <AdminAuthProvider>
        <AdminApp />
      </AdminAuthProvider>
    );
  }

  return (
    <RestaurantProvider>
      <TableProvider>
        <ToastProvider>
          <CustomerApp />
        </ToastProvider>
      </TableProvider>
    </RestaurantProvider>
  );
}
