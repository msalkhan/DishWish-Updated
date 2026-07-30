import { useState } from 'react';
import {
  UtensilsCrossed,
  BellRing,
  ReceiptText,
  Wallet,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  ChefHat,
} from 'lucide-react';
import { useTable } from '@/context/TableContext';
import { useOrderContext } from '@/context/OrderContext';
import { useRestaurant } from '@/context/RestaurantContext';
import { useToast } from '@/components/ui/Toast';
import { callWaiter } from '@/hooks/useData';
import { Ichimatsu, GoldDot, Blob } from '@/components/brand/Blob';
import { cn, formatPrice, estimatePrepTime } from '@/lib/utils';
import type { Route } from '@/components/layout/BottomNav';
import { ORDER_STATUS_LABELS } from '@/types/db';

export function Dashboard({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { table, tableNumber, tables, setTableNumber } = useTable();
  const { activeOrder, itemCount, subtotal, total } = useOrderContext();
  const { restaurant } = useRestaurant();
  const toast = useToast();
  const [calling, setCalling] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleCallWaiter = async () => {
    if (!tableNumber || !restaurant) return;
    setCalling(true);
    const { error } = await callWaiter(tableNumber, restaurant.id, 'call', 'Guest requested assistance');
    setCalling(false);
    if (error) {
      toast.push({ title: 'Could not reach the floor', body: error, variant: 'error' });
    } else {
      toast.push({
        title: 'A waiter is on the way',
        body: `Table ${tableNumber} — we'll be with you shortly.`,
        variant: 'notice',
      });
    }
  };

  const hasOrder = Boolean(activeOrder && itemCount > 0);
  const statusKey = activeOrder?.status ?? 'received';

  return (
    <div className="route-enter min-h-screen pb-28">
      {/* ---------- Green hero ---------- */}
      <header className="relative overflow-hidden bg-forest-700 text-cream-50">
        <div className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 text-forest-600/40">
          <Blob variant="b" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 text-forest-600/30">
          <Blob variant="c" className="h-full w-full" />
        </div>

        <div className="relative mx-auto max-w-md px-5 pt-20 pb-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GoldDot className="bg-coral-300" />
              <span className="tracked-label text-[10px] text-cream-200/80">{restaurant?.name ?? 'Dishwish'} · Table {tableNumber ?? '—'}</span>
            </div>
            {hasOrder && (
              <span className="pill bg-cream-50/10 text-cream-100">
                <span className="status-dot bg-coral-300" />
                {ORDER_STATUS_LABELS[statusKey] ?? 'Active'}
              </span>
            )}
          </div>

          <h1 className="mt-5 font-display text-[36px] font-medium leading-[1.05] tracking-tightish">
            Your evening, <br />
            <span className="text-coral-300">curated.</span>
          </h1>
          <p className="mt-3 max-w-[20rem] text-[13.5px] leading-relaxed text-cream-200/85">
            Menu, order, and bill — all in one place. Your session is tied to this table for the night.
          </p>

          {/* Table selector */}
          <div className="relative mt-6">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-cream-100/15 bg-forest-800/60 px-4 py-3 text-left backdrop-blur-sm transition-colors hover:bg-forest-800"
              aria-expanded={pickerOpen}
            >
              <span className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-cream-50/10">
                  <Ichimatsu
                    seed={table?.qr_token ?? tableNumber ?? 'dishwish'}
                    cells={6}
                    className="h-5 w-5"
                    cellClassName="rounded-[0.5px]"
                  />
                </span>
                <span>
                  <span className="block text-[10px] tracking-tracked text-cream-200/60">ACTIVE TABLE</span>
                  <span className="block text-[13px] font-medium text-cream-50">
                    {table ? `Table ${table.table_number} · ${table.capacity} seats` : 'Choose a table'}
                  </span>
                </span>
              </span>
              <span className="font-mono text-[11px] text-cream-200/50">{table?.qr_token ?? '—'}</span>
            </button>
            {pickerOpen && (
              <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-gold-300/30 bg-cream-50 p-1.5 shadow-deep animate-fadeIn">
                <div className="border-b border-gold-300/20 px-2.5 pb-1.5 pt-1">
                  <p className="tracked-label text-[9px] text-gold-600">Select your table</p>
                </div>
                <div className="max-h-56 overflow-auto">
                  {tables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTableNumber(t.table_number); setPickerOpen(false); }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors',
                        t.table_number === tableNumber ? 'bg-forest-700 text-cream-50' : 'text-ink-600 hover:bg-cream-200'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[11px] opacity-60">{t.table_number.toString().padStart(2, '0')}</span>
                        <span className="text-[13px] font-medium">Table {t.table_number}</span>
                      </span>
                      <span className={cn('text-[11px]', t.table_number === tableNumber ? 'text-cream-200/70' : 'text-ink-300')}>
                        {t.capacity} seats
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------- Live order summary / QR card ---------- */}
      <section className="mx-auto max-w-md px-5 -mt-10">
        {hasOrder ? (
          <button
            onClick={() => onNavigate('order')}
            className="card-surface group w-full rounded-2xl p-4 text-left transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:shadow-lifted"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-700 text-cream-50">
                  <ChefHat size={17} />
                </span>
                <div>
                  <p className="tracked-label text-[9px] text-gold-600">Active order</p>
                  <p className="font-display text-[15px] font-medium text-ink-600">
                    {ORDER_STATUS_LABELS[statusKey] ?? 'In progress'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[18px] font-semibold tabular-nums text-ink-600">${formatPrice(total)}</p>
                <p className="text-[11px] text-ink-300">{itemCount} items · est. {estimatePrepTime(itemCount)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-gold-300/15 pt-3 text-[12px] text-ink-400">
              <span className="font-mono text-ink-500">{activeOrder?.order_id}</span>
              <span className="ml-auto inline-flex items-center gap-1 font-medium text-coral-500 transition-transform group-hover:translate-x-0.5">
                Track <ArrowRight size={13} />
              </span>
            </div>
          </button>
        ) : (
          <div className="card-surface relative w-full rounded-2xl p-4">
            <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 text-cream-200/70">
              <Blob variant="a" className="h-full w-full" />
            </div>
            <div className="relative flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="rounded-xl border border-gold-300/40 bg-cream-100 p-2 text-ink-600 shadow-soft">
                  <Ichimatsu seed={table?.qr_token ?? tableNumber ?? 'dishwish'} cells={9} className="h-20 w-20" cellClassName="rounded-[1px]" />
                </div>
                <div className="absolute -right-2 -top-2 rotate-[-8deg] rounded-md border-2 border-hanko/70 bg-cream-50 px-1.5 py-0.5 text-center shadow-soft">
                  <div className="font-mono text-[7px] tracking-tracked text-hanko/80">TABLE</div>
                  <div className="font-display text-[13px] font-semibold leading-none text-hanko">{tableNumber ?? '--'}</div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="tracked-label text-[9px] text-gold-600">Scanned in</p>
                <p className="mt-1 font-display text-[18px] font-medium leading-tight text-ink-600">Ready to order</p>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-400">Browse the menu to start your evening.</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Stats row ---------- */}
      <section className="mx-auto max-w-md px-5 pt-6">
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Items" value={itemCount.toString()} Icon={ShoppingBag} active={itemCount > 0} />
          <StatCard label="Subtotal" value={`$${formatPrice(subtotal)}`} Icon={ReceiptText} active={subtotal > 0} />
          <StatCard label="Balance" value={`$${formatPrice(total)}`} Icon={Wallet} active={total > 0} />
        </div>
      </section>

      {/* ---------- Quick actions ---------- */}
      <section className="mx-auto max-w-md px-5 pt-7">
        <div className="mb-3 flex items-center gap-2">
          <GoldDot />
          <h2 className="tracked-label text-[10px] text-gold-600">Quick actions</h2>
        </div>

        <button
          onClick={() => onNavigate('menu')}
          className="card-surface group mb-3 flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:shadow-lifted"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-coral-300 text-forest-800 transition-transform duration-300 group-hover:scale-105">
            <UtensilsCrossed size={20} strokeWidth={2.2} />
          </span>
          <div className="flex-1">
            <p className="font-display text-[17px] font-medium leading-tight text-ink-600">View Menu</p>
            <p className="mt-0.5 text-[12px] text-ink-300">Explore tonight's kitchen — 35 dishes across 7 courses</p>
          </div>
          <ArrowRight size={18} className="text-ink-200 transition-all duration-300 group-hover:translate-x-1 group-hover:text-coral-400" />
        </button>

        <div className="grid grid-cols-3 gap-2.5">
          <ActionCard label="Call Waiter" sub="Assistance" Icon={BellRing} onClick={handleCallWaiter} disabled={calling || !tableNumber} loading={calling} />
          <ActionCard label="Track Order" sub={hasOrder ? `${itemCount} items` : 'View'} Icon={ReceiptText} onClick={() => onNavigate('order')} />
          <ActionCard label="Pay Bill" sub={total > 0 ? `$${formatPrice(total)}` : 'No balance'} Icon={Wallet} onClick={() => onNavigate('pay')} />
        </div>
      </section>

      {/* ---------- Kitchen note ---------- */}
      <section className="mx-auto max-w-md px-5 pt-6">
        <div className="surface relative overflow-hidden p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="tracked-label text-[9px] text-gold-600">From the kitchen</p>
              <p className="mt-1.5 font-display text-[15px] leading-snug text-ink-600">
                Tonight's omakase features matcha-cured salmon, binchotan wagyu, and a hojicha highball worth staying for.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, Icon, active }: { label: string; value: string; Icon: typeof ReceiptText; active: boolean }) {
  return (
    <div className={cn('surface px-3 py-3 transition-all duration-300', active && 'border-coral-300/30')}>
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={active ? 'text-coral-400' : 'text-ink-200'} />
        <span className="tracked-label text-[8px] text-gold-600">{label}</span>
      </div>
      <p className={cn('mt-1.5 font-mono text-[16px] font-semibold tabular-nums', active ? 'text-ink-600' : 'text-ink-300')}>{value}</p>
    </div>
  );
}

function ActionCard({ label, sub, Icon, onClick, disabled, loading }: { label: string; sub: string; Icon: typeof BellRing; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn('surface group flex flex-col items-start gap-2.5 rounded-2xl p-3 text-left transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:shadow-lifted', disabled && 'opacity-60')}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-700 text-cream-50 transition-transform duration-300 group-hover:scale-105">
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <span>
        <span className="block font-display text-[13px] font-medium leading-tight text-ink-600">{loading ? 'Calling…' : label}</span>
        <span className="mt-0.5 block text-[10.5px] text-ink-300">{sub}</span>
      </span>
    </button>
  );
}
