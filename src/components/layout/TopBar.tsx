import { ChevronDown, Check, Store } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTable } from '@/context/TableContext';
import { useOrderContext } from '@/context/OrderContext';
import { useRestaurant } from '@/context/RestaurantContext';
import { cn } from '@/lib/utils';

/**
 * Persistent top app bar — the product's "command bar".
 * Shows brand mark, live table context (switchable), restaurant switcher,
 * and an order-status pill. Adapts its surface to the active route.
 */
export function TopBar({
  variant = 'solid',
  onHome,
}: {
  variant?: 'solid' | 'ghost';
  onHome: () => void;
}) {
  const { tableNumber, tables, setTableNumber } = useTable();
  const { activeOrder, itemCount, total } = useOrderContext();
  const { restaurant, restaurants, setRestaurantSlug } = useRestaurant();
  const [tableOpen, setTableOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setTableOpen(false);
        setRestOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onGreen = variant === 'ghost';
  const status = activeOrder?.status ?? null;
  const statusLabel =
    status === 'received' ? 'Order received'
    : status === 'preparing' ? 'Preparing'
    : status === 'served' ? 'Served'
    : status === 'completed' ? 'Completed'
    : null;

  const ghostSurface = 'border-cream-100/20 bg-cream-50/10 text-cream-50 hover:bg-cream-50/15';
  const solidSurface = 'border-gold-300/40 bg-cream-50 text-ink-600 hover:border-gold-300';

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 pt-safe',
        onGreen
          ? 'border-cream-100/10 bg-forest-700/80 backdrop-blur-md'
          : 'border-gold-300/25 bg-cream-100/85 backdrop-blur-md'
      )}
    >
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4" ref={ref}>
        {/* Brand + restaurant name */}
        <button onClick={onHome} className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid h-8 w-8 place-items-center rounded-lg font-display text-[15px] font-semibold',
              onGreen ? 'bg-cream-50/10 text-cream-50' : 'bg-forest-700 text-cream-50'
            )}
          >
            Dw
          </span>
          <span className={cn('font-display text-[16px] font-medium tracking-tightish leading-none', onGreen ? 'text-cream-50' : 'text-ink-600')}>
            {restaurant?.name ?? 'Dishwish'}
          </span>
        </button>

        {/* Right cluster: status + restaurant switcher + table switcher */}
        <div className="flex items-center gap-2">
          {statusLabel && activeOrder && (
            <span
              className={cn(
                'pill hidden sm:inline-flex',
                onGreen ? 'bg-cream-50/10 text-cream-100' : 'bg-forest-100 text-forest-700'
              )}
            >
              <span className={cn('status-dot', status === 'completed' ? 'bg-forest-400' : 'bg-coral-400')} />
              {statusLabel}
            </span>
          )}

          {/* Admin link */}
          <button
            onClick={() => {
              window.history.pushState({}, '', '/admin');
              window.dispatchEvent(new Event('popstate'));
            }}
            className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors', onGreen ? ghostSurface : solidSurface)}
            title="Go to Admin Dashboard"
          >
            <Store size={13} className="opacity-70" />
            <span className="hidden sm:inline">Admin</span>
          </button>
          {restaurants.length > 1 && (
            <div className="relative">
              <button
                onClick={() => { setRestOpen((v) => !v); setTableOpen(false); }}
                className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors', onGreen ? ghostSurface : solidSurface)}
                aria-expanded={restOpen}
              >
                <Store size={13} className="opacity-60" />
                <ChevronDown size={12} className={cn('opacity-60 transition-transform', restOpen && 'rotate-180')} />
              </button>
              {restOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-gold-300/30 bg-cream-50 shadow-deep animate-fadeIn">
                  <div className="border-b border-gold-300/20 px-3 py-2">
                    <p className="tracked-label text-[9px] text-gold-600">Switch restaurant</p>
                  </div>
                  <div className="max-h-56 overflow-auto p-1.5">
                    {restaurants.map((r) => {
                      const active = r.id === restaurant?.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => { setRestaurantSlug(r.slug); setRestOpen(false); }}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition-colors',
                            active ? 'bg-forest-700 text-cream-50' : 'text-ink-600 hover:bg-cream-200'
                          )}
                        >
                          {r.name}
                          {active && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table switcher */}
          <div className="relative">
            <button
              onClick={() => { setTableOpen((v) => !v); setRestOpen(false); }}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors', onGreen ? ghostSurface : solidSurface)}
              aria-expanded={tableOpen}
            >
              <span className={cn('status-dot', tableNumber ? 'bg-coral-400' : 'bg-ink-200')} />
              <span className="font-mono">
                {tableNumber ? `T${String(tableNumber).padStart(2, '0')}` : 'Set table'}
              </span>
              <ChevronDown size={13} className={cn('opacity-60 transition-transform', tableOpen && 'rotate-180')} />
            </button>

            {tableOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-gold-300/30 bg-cream-50 shadow-deep animate-fadeIn">
                <div className="border-b border-gold-300/20 px-3 py-2">
                  <p className="tracked-label text-[9px] text-gold-600">Switch table</p>
                </div>
                <div className="max-h-56 overflow-auto p-1.5">
                  {tables.map((t) => {
                    const active = t.table_number === tableNumber;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setTableNumber(t.table_number); setTableOpen(false); }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition-colors',
                          active ? 'bg-forest-700 text-cream-50' : 'text-ink-600 hover:bg-cream-200'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[11px] opacity-60">
                            {String(t.table_number).padStart(2, '0')}
                          </span>
                          Table {t.table_number}
                        </span>
                        {active && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
                {itemCount > 0 && (
                  <div className="border-t border-gold-300/20 px-3 py-2 text-[11px] text-ink-300">
                    Cart: <span className="font-mono font-semibold text-ink-500">{itemCount}</span> items
                    {' · '}
                    <span className="font-mono font-semibold text-ink-500">${total.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
