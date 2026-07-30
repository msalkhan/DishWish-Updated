import { useMemo, useState } from 'react';
import { Search, Plus, Minus, X, SlidersHorizontal } from 'lucide-react';
import { useMenu } from '@/hooks/useData';
import { useOrderContext } from '@/context/OrderContext';
import { useTable } from '@/context/TableContext';
import { useRestaurant } from '@/context/RestaurantContext';
import { MENU_CATEGORIES } from '@/types/db';
import { FoodImage } from '@/components/ui/FoodImage';
import { GoldDot } from '@/components/brand/Blob';
import { CartBar } from '@/components/layout/CartBar';
import { cn, formatPrice } from '@/lib/utils';
import type { Route } from '@/components/layout/BottomNav';

export function Menu({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { restaurant } = useRestaurant();
  const { items, loading } = useMenu(restaurant?.id ?? null);
  const { lines, itemCount, total, addItem, setQuantity } = useOrderContext();
  const { tableNumber, setTableNumber, tables } = useTable();
  const [activeCat, setActiveCat] = useState<string>('All');
  const [query, setQuery] = useState('');

  const qtyFor = (dishId: string) => lines.find((l) => l.dish_id === dishId)?.quantity ?? 0;

  const filtered = useMemo(() => {
    let list = items;
    if (activeCat !== 'All') list = list.filter((i) => i.category === activeCat);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, activeCat, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of filtered) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category)!.push(it);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const categories = ['All', ...MENU_CATEGORIES];
  const countForCat = (cat: string) =>
    cat === 'All' ? items.length : items.filter((i) => i.category === cat).length;

  return (
    <div className="route-enter min-h-screen pb-40">
      {/* ---------- Sticky menu header ---------- */}
      <header className="sticky top-14 z-30 border-b border-gold-300/25 bg-cream-100/90 backdrop-blur-md">
        <div className="mx-auto max-w-md px-5 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="tracked-label text-[10px] text-gold-600">The menu</p>
              <h1 className="font-display text-[24px] font-medium leading-tight text-ink-600">À la carte</h1>
            </div>
            <div className="flex items-center gap-2">
              {tableNumber && (
                <span className="pill bg-forest-100 text-forest-700">
                  <span className="status-dot bg-coral-400" />
                  <span className="font-mono">T{String(tableNumber).padStart(2, '0')}</span>
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3.5">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-200" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes or ingredients…"
              className="field pl-10 pr-10"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-200 transition-colors hover:text-ink-500"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {categories.map((c) => {
              const count = countForCat(c);
              const active = activeCat === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-300',
                    active
                      ? 'border-coral-300 bg-coral-300 text-forest-800 shadow-soft'
                      : 'border-gold-300/35 bg-cream-50 text-ink-400 hover:border-gold-300 hover:text-ink-600'
                  )}
                >
                  {c}
                  <span className={cn('font-mono text-[10px] tabular-nums', active ? 'text-forest-800/60' : 'text-ink-200')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-5">
        {/* Result meta bar */}
        {!loading && (
          <div className="mb-4 flex items-center gap-2 text-[11.5px] text-ink-300">
            <SlidersHorizontal size={12} className="text-gold-500" />
            <span>
              {filtered.length} {filtered.length === 1 ? 'dish' : 'dishes'}
              {activeCat !== 'All' && <> in {activeCat}</>}
              {query && <> matching "{query}"</>}
            </span>
            {(activeCat !== 'All' || query) && (
              <button
                onClick={() => { setQuery(''); setActiveCat('All'); }}
                className="ml-auto font-medium text-coral-500 hover:text-coral-600"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {!tableNumber && tables.length > 0 && (
          <div className="mb-5 rounded-2xl border border-coral-300/50 bg-coral-50 p-4 text-[13px] text-coral-700">
            <p className="font-medium">Select a table to begin ordering.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tables.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTableNumber(t.table_number)}
                  className="rounded-full border border-coral-300 bg-cream-50 px-3 py-1 text-[12px] font-medium text-coral-600 transition-colors hover:bg-coral-100"
                >
                  Table {t.table_number}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <MenuSkeleton />
        ) : grouped.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-cream-200 text-gold-500">
              <Search size={24} strokeWidth={1.8} />
            </div>
            <p className="font-display text-[18px] text-ink-400">No dishes match your search.</p>
            <button onClick={() => { setQuery(''); setActiveCat('All'); }} className="mt-3 text-[13px] font-medium text-coral-500 hover:text-coral-600">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([category, list]) => (
              <section key={category}>
                <div className="mb-3 flex items-center gap-2">
                  <GoldDot />
                  <h2 className="font-display text-[19px] font-medium tracking-tightish text-ink-600">{category}</h2>
                  <span className="ml-auto font-mono text-[11px] text-ink-200">{list.length}</span>
                </div>
                <div className="space-y-3">
                  {list.map((item) => {
                    const qty = qtyFor(item.id);
                    return (
                      <article
                        key={item.id}
                        className={cn(
                          'card-surface group flex gap-4 rounded-2xl p-3 transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:shadow-lifted',
                          qty > 0 && 'ring-1 ring-coral-300/25'
                        )}
                      >
                        <FoodImage src={item.image_url} alt={item.name} rounded="rounded-xl" className="h-24 w-24 shrink-0" />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-[16px] font-medium leading-tight text-ink-600">{item.name}</h3>
                            {qty > 0 && (
                              <span className="pill shrink-0 bg-coral-100 text-coral-600">
                                <span className="font-mono">{qty} in cart</span>
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-300">{item.description}</p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <span className="font-mono text-[15px] font-semibold text-ink-600">${formatPrice(item.price)}</span>
                            <Stepper
                              qty={qty}
                              onAdd={() => addItem(item, 1)}
                              onRemove={() => setQuantity(item.id, Math.max(0, qty - 1))}
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <CartBar itemCount={itemCount} total={total} onClick={() => onNavigate('order')} />
    </div>
  );
}

function Stepper({ qty, onAdd, onRemove }: { qty: number; onAdd: () => void; onRemove: () => void }) {
  if (qty === 0) {
    return (
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 rounded-full bg-coral-300 px-3.5 py-1.5 text-[12.5px] font-semibold text-forest-800 shadow-soft transition-all duration-300 ease-gentle hover:bg-coral-400 hover:shadow-lifted active:scale-95"
      >
        <Plus size={14} strokeWidth={2.6} /> Add
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-full border border-gold-300/40 bg-cream-50 p-1 shadow-soft">
      <button
        onClick={onRemove}
        className="grid h-7 w-7 place-items-center rounded-full text-ink-500 transition-colors hover:bg-cream-200 active:scale-95"
        aria-label="Decrease quantity"
      >
        <Minus size={13} strokeWidth={2.6} />
      </button>
      <span className="min-w-5 text-center font-mono text-[13px] font-semibold tabular-nums text-ink-600">{qty}</span>
      <button
        onClick={onAdd}
        className="grid h-7 w-7 place-items-center rounded-full bg-coral-300 text-forest-800 transition-all duration-300 hover:bg-coral-400 active:scale-95"
        aria-label="Increase quantity"
      >
        <Plus size={13} strokeWidth={2.6} />
      </button>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <div className="mb-3 h-6 w-40 skeleton rounded-lg" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="card-surface flex gap-4 rounded-2xl p-3">
                <div className="skeleton h-24 w-24 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
