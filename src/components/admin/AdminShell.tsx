import { useState, type ReactNode } from 'react';
import {
  BookOpen,
  Table2,
  ClipboardList,
  BellRing,
  BarChart3,
  CreditCard,
  LogOut,
  Menu as MenuIcon,
  X,
  Store,
} from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { cn } from '@/lib/utils';

export type AdminRoute = 'menu' | 'tables' | 'orders' | 'waiter' | 'analytics' | 'billing';

interface NavItem {
  key: AdminRoute;
  label: string;
  Icon: typeof BookOpen;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'orders', label: 'Live Orders', Icon: ClipboardList },
  { key: 'waiter', label: 'Waiter Requests', Icon: BellRing },
  { key: 'menu', label: 'Menu', Icon: BookOpen },
  { key: 'tables', label: 'Tables', Icon: Table2 },
  { key: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { key: 'billing', label: 'Billing', Icon: CreditCard },
];

export function AdminShell({
  route,
  onNavigate,
  children,
}: {
  route: AdminRoute;
  onNavigate: (r: AdminRoute) => void;
  children: ReactNode;
}) {
  const { restaurant, signOut } = useAdminAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentLabel = NAV_ITEMS.find((n) => n.key === route)?.label ?? '';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarContent route={route} onNavigate={onNavigate} />
      </aside>

      {/* ---------- Mobile nav overlay ---------- */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl lg:hidden animate-fadeIn">
            <SidebarContent
              route={route}
              onNavigate={(r) => { onNavigate(r); setMobileNavOpen(false); }}
              onClose={() => setMobileNavOpen(false)}
            />
          </aside>
        </>
      )}

      {/* ---------- Main content ---------- */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-sm lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <MenuIcon size={18} />
            </button>
            <h1 className="text-base font-semibold text-slate-900">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            {restaurant && (
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {restaurant.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
              </span>
            )}
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new Event('popstate'));
              }}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Guest App
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  route,
  onNavigate,
  onClose,
}: {
  route: AdminRoute;
  onNavigate: (r: AdminRoute) => void;
  onClose?: () => void;
}) {
  const { restaurant, restaurants, setRestaurantSlug, user, signOut } = useAdminAuth();

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex flex-1 items-center gap-2.5 min-w-0 pr-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-white">
            <Store size={18} />
          </div>
          <div className="min-w-0 flex-1">
            {restaurants.length > 1 ? (
              <select
                value={restaurant?.slug ?? ''}
                onChange={(e) => setRestaurantSlug(e.target.value)}
                className="w-full truncate rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="truncate text-sm font-semibold text-slate-900">
                {restaurant?.name ?? 'Dishwish'}
              </p>
            )}
            <p className="truncate text-xs text-slate-400 mt-0.5">Admin Dashboard</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = route === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 px-5 py-4">
        {user?.email && (
          <p className="mb-2 truncate text-xs text-slate-400">{user.email}</p>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </>
  );
}
