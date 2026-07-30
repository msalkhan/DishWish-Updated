import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  SERVICE_CHARGE_RATE,
  TAX_RATE,
  type MenuItem,
  type Order,
  type OrderItemRow,
  type OrderItemSummary,
} from '@/types/db';
import { generateOrderId } from '@/lib/utils';

export interface CartLine {
  orderItemId?: string;
  dish_id: string;
  dish_name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface UseOrderResult {
  activeOrder: Order | null;
  lines: CartLine[];
  loading: boolean;
  error: string | null;
  itemCount: number;
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
  addItem: (item: MenuItem, qty?: number) => Promise<void>;
  setQuantity: (dishId: string, qty: number) => Promise<void>;
  refresh: () => Promise<void>;
  clearLocal: () => void;
}

/**
 * Loads + persists the active ("not completed") order for a given table.
 * The order, its line items, and running totals all live in Supabase so a
 * refresh or re-scan resumes the correct order. All queries are scoped by
 * restaurant_id.
 */
export function useOrder(
  tableNumber: number | null,
  restaurantId: string | null
): UseOrderResult {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tableRef = useRef<number | null>(tableNumber);

  const computeTotals = (lns: CartLine[]) => {
    const subtotal = lns.reduce((s, l) => s + l.price * l.quantity, 0);
    const serviceCharge = +(subtotal * SERVICE_CHARGE_RATE).toFixed(2);
    const tax = +(subtotal * TAX_RATE).toFixed(2);
    const total = +(subtotal + serviceCharge + tax).toFixed(2);
    return { subtotal, serviceCharge, tax, total };
  };

  const persistOrderHeader = useCallback(
    async (order: Order, lns: CartLine[]) => {
      const summary: OrderItemSummary[] = lns.map((l) => ({
        dish_id: l.dish_id,
        name: l.dish_name,
        quantity: l.quantity,
        price: l.price,
      }));
      const { subtotal, serviceCharge, tax, total } = computeTotals(lns);
      try {
        await supabase
          .from('orders')
          .update({
            items: summary,
            subtotal,
            service_charge: serviceCharge,
            tax,
            total,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      } catch {
        // Continue with local update if Supabase fails
      }
      setActiveOrder({
        ...order,
        items: summary,
        subtotal,
        service_charge: serviceCharge,
        tax,
        total,
      });
    },
    []
  );

  const loadOrder = useCallback(async (tableNo: number, restId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('table_number', tableNo)
        .eq('restaurant_id', restId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!orderErr && orderData) {
        const order = orderData as Order;
        const { data: itemRows } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)
          .order('created_at', { ascending: true });
        const loadedLines: CartLine[] = (itemRows as OrderItemRow[] ?? []).map((r) => ({
          orderItemId: r.id,
          dish_id: r.dish_id ?? '',
          dish_name: r.dish_name,
          quantity: r.quantity,
          price: Number(r.price),
          notes: r.notes ?? undefined,
        }));
        setActiveOrder(order);
        setLines(loadedLines);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureOrder = useCallback(
    async (tableNo: number, restId: string): Promise<Order> => {
      if (activeOrder) return activeOrder;
      const orderId = generateOrderId();
      let order: Order = {
        id: `ord-${Date.now()}`,
        order_id: orderId,
        table_number: tableNo,
        restaurant_id: restId,
        items: [],
        subtotal: 0,
        service_charge: 0,
        tax: 0,
        total: 0,
        status: 'received',
        payment_status: 'unpaid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      try {
        const { data } = await supabase
          .from('orders')
          .insert({
            order_id: orderId,
            table_number: tableNo,
            restaurant_id: restId,
            items: [],
            subtotal: 0,
            service_charge: 0,
            tax: 0,
            total: 0,
            status: 'received',
            payment_status: 'unpaid',
          })
          .select('*')
          .single();
        if (data) order = data as Order;
      } catch {
        // Use local order
      }
      setActiveOrder(order);
      return order;
    },
    [activeOrder]
  );

  const addItem = useCallback(
    async (item: MenuItem, qty = 1) => {
      if (!tableNumber || !restaurantId) return;
      setError(null);
      try {
        const order = await ensureOrder(tableNumber, restaurantId);
        const existing = lines.find((l) => l.dish_id === item.id);
        if (existing) {
          const newQty = existing.quantity + qty;
          try {
            if (existing.orderItemId) {
              await supabase
                .from('order_items')
                .update({ quantity: newQty })
                .eq('id', existing.orderItemId);
            }
          } catch {
            // ignore
          }
          const next = lines.map((l) =>
            l.dish_id === item.id ? { ...l, quantity: newQty } : l
          );
          setLines(next);
          await persistOrderHeader(order, next);
        } else {
          let orderItemId = `item-${Date.now()}`;
          try {
            const { data: newRow } = await supabase
              .from('order_items')
              .insert({
                order_id: order.id,
                dish_id: item.id,
                dish_name: item.name,
                quantity: qty,
                price: item.price,
                notes: null,
              })
              .select('*')
              .single();
            if (newRow) orderItemId = (newRow as OrderItemRow).id;
          } catch {
            // ignore
          }
          const next = [
            ...lines,
            {
              orderItemId,
              dish_id: item.id,
              dish_name: item.name,
              quantity: qty,
              price: item.price,
            },
          ];
          setLines(next);
          await persistOrderHeader(order, next);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not add item');
      }
    },
    [tableNumber, restaurantId, lines, ensureOrder, persistOrderHeader]
  );

  const setQuantity = useCallback(
    async (dishId: string, qty: number) => {
      if (!activeOrder) return;
      setError(null);
      try {
        const existing = lines.find((l) => l.dish_id === dishId);
        if (!existing) return;
        if (qty <= 0) {
          try {
            if (existing.orderItemId) {
              await supabase
                .from('order_items')
                .delete()
                .eq('id', existing.orderItemId);
            }
          } catch {
            // ignore
          }
          const next = lines.filter((l) => l.dish_id !== dishId);
          setLines(next);
          await persistOrderHeader(activeOrder, next);
        } else {
          try {
            if (existing.orderItemId) {
              await supabase
                .from('order_items')
                .update({ quantity: qty })
                .eq('id', existing.orderItemId);
            }
          } catch {
            // ignore
          }
          const next = lines.map((l) => (l.dish_id === dishId ? { ...l, quantity: qty } : l));
          setLines(next);
          await persistOrderHeader(activeOrder, next);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update item');
      }
    },
    [activeOrder, lines, persistOrderHeader]
  );

  const refresh = useCallback(async () => {
    if (tableNumber && restaurantId) await loadOrder(tableNumber, restaurantId);
  }, [tableNumber, restaurantId, loadOrder]);

  const clearLocal = useCallback(() => {
    setActiveOrder(null);
    setLines([]);
    setError(null);
  }, []);

  const cancelOrder = useCallback(async () => {
    if (!activeOrder) return;
    try {
      // Delete order items first
      await supabase.from('order_items').delete().eq('order_id', activeOrder.id);
      // Delete main order
      await supabase.from('orders').delete().eq('id', activeOrder.id);
    } catch {
      // ignore errors
    }
    setActiveOrder(null);
    setLines([]);
    setError(null);
  }, [activeOrder]);

  useEffect(() => {
    tableRef.current = tableNumber;
    if (tableNumber != null && restaurantId) {
      loadOrder(tableNumber, restaurantId);
    } else {
      setActiveOrder(null);
      setLines([]);
      setLoading(false);
    }
  }, [tableNumber, restaurantId, loadOrder]);

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const totals = computeTotals(lines);

  return {
    activeOrder,
    lines,
    loading,
    error,
    itemCount,
    subtotal: totals.subtotal,
    serviceCharge: totals.serviceCharge,
    tax: totals.tax,
    total: totals.total,
    addItem,
    setQuantity,
    refresh,
    clearLocal,
    cancelOrder,
  };
}
