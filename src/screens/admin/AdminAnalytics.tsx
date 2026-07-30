import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import type { Order, OrderItemRow } from '@/types/db';
import { cn, formatPrice } from '@/lib/utils';

export function AdminAnalytics() {
  const { restaurant } = useAdminAuth();
  const restaurantId = restaurant?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [ordersToday, setOrdersToday] = useState<Order[]>([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [topDishes, setTopDishes] = useState<{ name: string; count: number; revenue: number }[]>([]);

  const loadAnalytics = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);

    // Get today's date boundaries
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_id, table_number, total, status, payment_status, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startOfDay)
      .order('created_at', { ascending: false });
    if (error || !data) { setLoading(false); return; }

    const todayOrders = data as Order[];
    setOrdersToday(todayOrders);

    // Revenue = sum of totals for paid orders
    const revenue = todayOrders
      .filter((o) => o.payment_status === 'paid')
      .reduce((s, o) => s + Number(o.total), 0);
    setRevenueToday(revenue);

    // Load order items for today's orders to find most-ordered dishes
    const orderIds = todayOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('dish_name, quantity, price')
        .in('order_id', orderIds);
      if (items) {
        const dishMap = new Map<string, { count: number; revenue: number }>();
        for (const item of items as OrderItemRow[]) {
          const key = item.dish_name;
          const existing = dishMap.get(key) ?? { count: 0, revenue: 0 };
          existing.count += item.quantity;
          existing.revenue += Number(item.price) * item.quantity;
          dishMap.set(key, existing);
        }
        const ranked = Array.from(dishMap.entries())
          .map(([name, stats]) => ({ name, count: stats.count, revenue: stats.revenue }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopDishes(ranked);
      }
    } else {
      setTopDishes([]);
    }

    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const paidCount = ordersToday.filter((o) => o.payment_status === 'paid').length;
  const avgOrder = ordersToday.length > 0 ? revenueToday / paidCount : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders Today"
          value={String(ordersToday.length)}
          sub={`${paidCount} paid`}
          Icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          label="Revenue Today"
          value={`$${formatPrice(revenueToday)}`}
          sub="From paid orders"
          Icon={DollarSign}
          color="emerald"
        />
        <StatCard
          label="Avg. Order"
          value={`$${formatPrice(avgOrder)}`}
          sub="Per paid order"
          Icon={TrendingUp}
          color="amber"
        />
        <StatCard
          label="Active Tables"
          value={String(new Set(ordersToday.map((o) => o.table_number)).size)}
          sub="Tables ordered today"
          Icon={Award}
          color="slate"
        />
      </div>

      {/* Top dishes */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Most-Ordered Dishes Today</h2>
        {topDishes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No orders yet today.</p>
        ) : (
          <div className="space-y-2">
            {topDishes.map((dish, i) => (
              <div
                key={dish.name}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50"
              >
                <span className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold',
                  i === 0 ? 'bg-amber-100 text-amber-700' :
                  i === 1 ? 'bg-slate-200 text-slate-600' :
                  i === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-400'
                )}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{dish.name}</p>
                  <p className="text-xs text-slate-400">{dish.count} orders</p>
                </div>
                {/* Bar */}
                <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-slate-100 sm:block">
                  <div
                    className="h-full rounded-full bg-slate-800"
                    style={{ width: `${(dish.count / topDishes[0].count) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-sm font-semibold text-slate-700">${formatPrice(dish.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders list */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Recent Orders Today</h2>
        {ordersToday.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No orders yet today.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {ordersToday.slice(0, 10).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-mono text-sm font-medium text-slate-900">{order.order_id}</span>
                  <span className="ml-2 text-sm text-slate-500">Table {order.table_number}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  )}>
                    {order.payment_status}
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-900">${formatPrice(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  Icon: typeof ShoppingBag;
  color: 'blue' | 'emerald' | 'amber' | 'slate';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={cn('grid h-8 w-8 place-items-center rounded-lg', colors[color])}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}
