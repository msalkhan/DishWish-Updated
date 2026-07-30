import { useCallback, useEffect, useState } from 'react';
import { Loader2, ArrowRight, Clock, CheckCircle2, ChefHat, UtensilsCrossed, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderItemRow,
} from '@/types/db';
import { cn, formatPrice, timeAgo } from '@/lib/utils';

const STEP_FLOW = ['received', 'preparing', 'served', 'completed'] as const;
const STATUS_STYLES: Record<string, string> = {
  received: 'bg-blue-50 text-blue-700 border-blue-200',
  preparing: 'bg-amber-50 text-amber-700 border-amber-200',
  served: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function AdminOrders() {
  const { restaurant } = useAdminAuth();
  const restaurantId = restaurant?.id ?? null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemMap, setItemMap] = useState<Record<string, OrderItemRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');
  const [advancing, setAdvancing] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    let q = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (filter === 'active') {
      q = q.neq('status', 'completed');
    } else if (filter !== 'all') {
      q = q.eq('status', filter);
    }
    const { data, error } = await q.limit(50);
    if (!error && data) {
      const ordersData = data as Order[];
      setOrders(ordersData);
      // Load items for each order
      const ids = ordersData.map((o) => o.id);
      if (ids.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', ids)
          .order('created_at', { ascending: true });
        if (items) {
          const map: Record<string, OrderItemRow[]> = {};
          for (const row of items as OrderItemRow[]) {
            if (!map[row.order_id]) map[row.order_id] = [];
            map[row.order_id].push(row);
          }
          setItemMap(map);
        }
      } else {
        setItemMap({});
      }
    }
    setLoading(false);
  }, [restaurantId, filter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => { loadOrders(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, loadOrders]);

  const advanceStatus = async (order: Order) => {
    const currentIndex = STEP_FLOW.indexOf(order.status as (typeof STEP_FLOW)[number]);
    if (currentIndex < 0 || currentIndex >= STEP_FLOW.length - 1) return;
    const nextStatus = STEP_FLOW[currentIndex + 1];
    setAdvancing(order.id);
    await supabase
      .from('orders')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
        ...(nextStatus === 'completed' ? { payment_status: 'paid' } : {}),
      })
      .eq('id', order.id);
    setAdvancing(null);
    loadOrders();
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    setAdvancing(orderId);
    try {
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
    } catch {
      // ignore
    }
    setAdvancing(null);
    loadOrders();
  };

  const filterTabs = [
    { key: 'active', label: 'Active' },
    { key: 'received', label: 'Received' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'served', label: 'Served' },
    { key: 'completed', label: 'Completed' },
    { key: 'all', label: 'All' },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-all',
              filter === t.key
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-20 text-center">
          <CheckCircle2 size={32} className="mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">No orders in this view.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => {
            const items = itemMap[order.id] ?? [];
            const currentIndex = STEP_FLOW.indexOf(order.status as (typeof STEP_FLOW)[number]);
            const isCompleted = order.status === 'completed';
            return (
              <div
                key={order.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900">{order.order_id}</span>
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[order.status] ?? '')}>
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Table {order.table_number} · {timeAgo(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="font-mono text-lg font-bold text-slate-900">${formatPrice(order.total)}</p>
                      <p className={cn(
                        'text-xs font-medium',
                        order.payment_status === 'paid' ? 'text-emerald-600' : 'text-slate-400'
                      )}>
                        {order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'pending' ? 'Pending' : 'Unpaid'}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteOrder(order.id)}
                      title="Delete order"
                      className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                  {items.length === 0 ? (
                    <p className="text-xs text-slate-400">No items</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="flex items-baseline justify-between text-sm">
                        <span className="text-slate-700">
                          <span className="font-mono font-semibold text-slate-500">{item.quantity}×</span> {item.dish_name}
                        </span>
                        <span className="font-mono text-xs text-slate-400">${formatPrice(Number(item.price) * item.quantity)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Status stepper */}
                {!isCompleted && (
                  <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
                    {STEP_FLOW.slice(0, 3).map((step, i) => {
                      const done = i < currentIndex;
                      const current = i === currentIndex;
                      return (
                        <div key={step} className="flex flex-1 items-center gap-1">
                          <span className={cn(
                            'flex items-center gap-1 text-xs font-medium',
                            done ? 'text-slate-700' : current ? 'text-slate-900' : 'text-slate-300'
                          )}>
                            {done ? <CheckCircle2 size={13} className="text-emerald-500" /> :
                              step === 'received' ? <Clock size={13} /> :
                              step === 'preparing' ? <ChefHat size={13} /> :
                              <UtensilsCrossed size={13} />}
                            {ORDER_STATUS_LABELS[step]}
                          </span>
                          {i < 2 && <div className={cn('h-px flex-1', done ? 'bg-emerald-300' : 'bg-slate-200')} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Advance button */}
                {!isCompleted && currentIndex >= 0 && currentIndex < STEP_FLOW.length - 1 && (
                  <button
                    onClick={() => advanceStatus(order)}
                    disabled={advancing === order.id}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-900 active:scale-[0.98] disabled:opacity-60"
                  >
                    {advancing === order.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <>
                        Advance to {ORDER_STATUS_LABELS[STEP_FLOW[currentIndex + 1]]}
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                )}
                {isCompleted && (
                  <div className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2.5 text-sm font-medium text-slate-400">
                    <CheckCircle2 size={14} /> Completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
