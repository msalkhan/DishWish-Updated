import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { AdminShell, type AdminRoute } from '@/components/admin/AdminShell';
import { AdminMenu } from '@/screens/admin/AdminMenu';
import { AdminTables } from '@/screens/admin/AdminTables';
import { AdminOrders } from '@/screens/admin/AdminOrders';
import { AdminWaiter } from '@/screens/admin/AdminWaiter';
import { AdminAnalytics } from '@/screens/admin/AdminAnalytics';
import { AdminBilling } from '@/screens/admin/AdminBilling';
import { AdminLogin } from '@/screens/admin/AdminLogin';
import { Loader2 } from 'lucide-react';

export function AdminApp() {
  const { session, restaurant, loading } = useAdminAuth();
  const [route, setRoute] = useState<AdminRoute>('orders');

  // Set hash route for persistence
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['menu', 'tables', 'orders', 'waiter', 'analytics', 'billing'].includes(hash)) {
      setRoute(hash as AdminRoute);
    }
  }, []);

  const navigate = (r: AdminRoute) => {
    setRoute(r);
    window.location.hash = r;
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session) {
    return <AdminLogin />;
  }

  // If logged in but no restaurant profile yet (edge case), show empty state
  if (!restaurant) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900">No restaurant linked</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your account isn't linked to a restaurant yet. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell route={route} onNavigate={navigate}>
      {route === 'orders' && <AdminOrders />}
      {route === 'waiter' && <AdminWaiter />}
      {route === 'menu' && <AdminMenu />}
      {route === 'tables' && <AdminTables />}
      {route === 'analytics' && <AdminAnalytics />}
      {route === 'billing' && <AdminBilling />}
    </AdminShell>
  );
}
