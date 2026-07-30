import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, FileText, Clock, CheckCircle2, ChefHat, UtensilsCrossed, Trash2, AlertTriangle } from 'lucide-react';
import { useOrderContext } from '@/context/OrderContext';
import { useTable } from '@/context/TableContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { ORDER_STATUS_LABELS, type Order, type OrderItemRow } from '@/types/db';
import { Perforation, GoldDot, Hanko } from '@/components/brand/Blob';
import { cn, formatPrice, estimatePrepTime } from '@/lib/utils';
import type { Route } from '@/components/layout/BottomNav';

const STEP_FLOW = ['received', 'preparing', 'served'] as const;
const STEP_ICONS = [CheckCircle2, ChefHat, UtensilsCrossed] as const;

export function OrderConfirmation({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { activeOrder, lines, loading, itemCount, subtotal, serviceCharge, tax, total, refresh, cancelOrder } = useOrderContext();
  const { tableNumber } = useTable();
  const toast = useToast();
  const [itemRows, setItemRows] = useState<OrderItemRow[]>([]);
  const [liveOrder, setLiveOrder] = useState<Order | null>(activeOrder);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!activeOrder) return;
    let active = true;
    setLiveOrder(activeOrder);
    const poll = async () => {
      const { data } = await supabase.from('orders').select('*').eq('id', activeOrder.id).maybeSingle();
      if (active && data) setLiveOrder(data as Order);
    };
    const id = setInterval(poll, 6000);
    return () => { active = false; clearInterval(id); };
  }, [activeOrder]);

  useEffect(() => {
    if (!activeOrder) { setItemRows([]); return; }
    let active = true;
    supabase
      .from('order_items')
      .select('*')
      .eq('order_id', activeOrder.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (active && data) setItemRows(data as OrderItemRow[]); });
    return () => { active = false; };
  }, [activeOrder, lines]);

  const status = liveOrder?.status ?? activeOrder?.status ?? 'received';
  const activeStepIndex = STEP_FLOW.indexOf(status as (typeof STEP_FLOW)[number]);
  const resolvedItems = itemRows.length > 0 ? itemRows : lines.map((l) => ({ ...l, dish_name: l.dish_name } as OrderItemRow));
  const placedTime = liveOrder?.created_at ?? activeOrder?.created_at;

  if (loading) {
    return <div className="route-enter mx-auto max-w-md px-5 pt-24"><div className="skeleton mx-auto h-48 w-full rounded-2xl" /></div>;
  }

  if (!activeOrder) {
    return (
      <div className="route-enter mx-auto max-w-md px-5 pt-20 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-cream-200 text-gold-500">
          <FileText size={26} strokeWidth={1.8} />
        </div>
        <h1 className="font-display text-[24px] font-medium text-ink-600">No active order</h1>
        <p className="mt-2 text-[14px] text-ink-300">
          Your table hasn't ordered yet. Start with the menu and your ticket will appear here.
        </p>
        <button onClick={() => onNavigate('menu')} className="btn-primary mt-6">
          Browse the menu
        </button>
      </div>
    );
  }

  return (
    <div className="route-enter mx-auto max-w-md px-5 pb-32 pt-20">
      {/* Back */}
      <button
        onClick={() => onNavigate('menu')}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-600"
      >
        <ArrowLeft size={15} /> Back to menu
      </button>

      {/* ---------- Ticket ---------- */}
      <article className="relative overflow-hidden rounded-2xl border border-gold-300/30 bg-cream-50 shadow-lifted">
        {/* Header */}
        <header className="relative bg-forest-700 px-5 py-5 text-cream-50">
          <div className="pointer-events-none absolute -right-10 -top-8 h-32 w-32 text-forest-600/40">
            <svg viewBox="0 0 360 300" className="h-full w-full" aria-hidden="true">
              <path d="M160 30c40-4 78 18 96 52s14 80-8 112-66 50-104 44-72-36-82-74 8-82 36-106 58-26 62-28z" fill="currentColor" />
            </svg>
          </div>
          <div className="relative flex items-start justify-between">
            <div>
              <p className="tracked-label text-[10px] text-coral-300">Your ticket</p>
              <h1 className="mt-1 font-display text-[22px] font-medium leading-none">Omakase receipt</h1>
            </div>
            <Hanko label="受理" className="h-11 w-11 text-hanko/90" />
          </div>
          <div className="relative mt-4 flex items-end justify-between">
            <div>
              <p className="text-[9px] tracking-tracked text-cream-200/60">ORDER NO.</p>
              <p className="font-mono text-[17px] font-semibold text-cream-50">{activeOrder.order_id}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] tracking-tracked text-cream-200/60">TABLE</p>
              <p className="font-mono text-[17px] font-semibold text-cream-50">
                {String(tableNumber ?? activeOrder.table_number).padStart(2, '0')}
              </p>
            </div>
            {placedTime && (
              <div className="text-right">
                <p className="text-[9px] tracking-tracked text-cream-200/60">PLACED</p>
                <p className="font-mono text-[13px] text-cream-200/90">
                  {new Date(placedTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </header>

        {/* Perforation */}
        <div className="relative">
          <Perforation className="mx-5" />
          <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-cream-100" />
          <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-cream-100" />
        </div>

        {/* Items */}
        <div className="px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <GoldDot />
            <p className="tracked-label text-[10px] text-gold-600">Items · {resolvedItems.length}</p>
          </div>
          {resolvedItems.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-ink-300">This order is empty.</p>
          ) : (
            <ul className="space-y-2.5">
              {resolvedItems.map((row) => (
                <li key={row.id ?? row.dish_id} className="flex items-baseline justify-between gap-3">
                  <span className="flex items-baseline gap-2.5">
                    <span className="font-mono text-[13px] font-semibold text-coral-500 tabular-nums">{row.quantity}×</span>
                    <span className="text-[14px] text-ink-600">{row.dish_name}</span>
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-ink-500">
                    ${formatPrice(Number(row.price) * row.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Perforation className="my-4" />

          {/* Totals */}
          <dl className="space-y-1.5 text-[13px]">
            <Row label="Subtotal" value={`$${formatPrice(subtotal)}`} />
            <Row label="Service charge (10%)" value={`$${formatPrice(serviceCharge)}`} muted />
            <Row label="Tax (8%)" value={`$${formatPrice(tax)}`} muted />
            <Perforation className="my-2" />
            <div className="flex items-baseline justify-between">
              <dt className="font-display text-[16px] font-medium text-ink-600">Total</dt>
              <dd className="font-mono text-[18px] font-semibold tabular-nums text-ink-600">${formatPrice(total)}</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2.5 text-[12px] text-ink-400">
            <Clock size={14} className="text-gold-500" />
            Estimated prep time
            <span className="ml-auto font-mono font-semibold text-ink-600">{estimatePrepTime(itemCount)}</span>
          </div>
        </div>

        {/* ---------- Status timeline ---------- */}
        <div className="border-t border-gold-300/25 bg-cream-100/50 px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="tracked-label text-[10px] text-gold-600">Order status</p>
            <span className="pill bg-forest-100 text-forest-700">
              <span className={cn('status-dot', status === 'completed' ? 'bg-forest-400' : 'bg-coral-400')} />
              {ORDER_STATUS_LABELS[status] ?? status}
            </span>
          </div>
          {/* Vertical timeline */}
          <div className="relative space-y-4">
            {STEP_FLOW.map((step, i) => {
              const done = i < activeStepIndex;
              const current = i === activeStepIndex;
              const Icon = STEP_ICONS[i];
              return (
                <div key={step} className="relative flex items-start gap-3">
                  {/* connector */}
                  {i < STEP_FLOW.length - 1 && (
                    <span className={cn('absolute left-3 top-7 h-8 w-px', done ? 'bg-gold-400' : 'bg-gold-300/30')} />
                  )}
                  <span
                    className={cn(
                      'relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all duration-300',
                      done && 'border-gold-400 bg-gold-400 text-cream-50',
                      current && 'border-gold-500 bg-cream-50 text-gold-600 shadow-goldline',
                      !done && !current && 'border-gold-300/50 bg-cream-50 text-ink-200'
                    )}
                  >
                    {done ? <CheckCircle2 size={13} /> : <Icon size={12} />}
                  </span>
                  <div className="flex-1 pb-1">
                    <p className={cn('text-[13px] font-medium transition-colors', current ? 'text-gold-600' : done ? 'text-ink-600' : 'text-ink-300')}>
                      {ORDER_STATUS_LABELS[step]}
                    </p>
                    <p className="text-[11px] text-ink-200">
                      {step === 'received' && 'Your order is confirmed with the kitchen.'}
                      {step === 'preparing' && 'Our chefs are plating your courses.'}
                      {step === 'served' && 'Your dishes are at the table — enjoy.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </article>

      {/* Actions */}
      <div className="mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onNavigate('menu')} className="btn-secondary">
            <Plus size={16} /> Add more items
          </button>
          <button
            onClick={async () => { await refresh(); onNavigate('pay'); }}
            className="btn-primary"
          >
            <FileText size={16} /> Request the bill
          </button>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-coral-400/30 bg-coral-400/10 px-4 py-3 text-[13px] font-medium text-coral-500 transition-all hover:bg-coral-400/20 active:scale-[0.99]"
        >
          <Trash2 size={15} /> Cancel & Delete Placed Order
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-600/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-cream-50 p-6 shadow-2xl border border-gold-300/30">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-400/10 text-coral-500 mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-center font-display text-[18px] font-medium text-ink-600">
              Delete Placed Order?
            </h3>
            <p className="mt-2 text-center text-[13px] text-ink-400 leading-relaxed">
              Are you sure you want to cancel order <span className="font-mono font-semibold text-ink-600">{activeOrder.order_id}</span>? This will remove all items and notify the kitchen.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn-secondary flex-1 py-2.5 text-[13px]"
              >
                Keep Order
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  await cancelOrder();
                  setDeleting(false);
                  setShowDeleteConfirm(false);
                  toast.push({ title: 'Order deleted', body: 'Your order has been cancelled and removed.', variant: 'success' });
                }}
                disabled={deleting}
                className="btn-primary flex-1 bg-coral-500 hover:bg-coral-600 text-white py-2.5 text-[13px]"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={muted ? 'text-ink-300' : 'text-ink-500'}>{label}</dt>
      <dd className="font-mono tabular-nums text-ink-500">{value}</dd>
    </div>
  );
}
