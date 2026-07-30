import { createContext, useContext, type ReactNode } from 'react';
import { useOrder as useOrderHook, type CartLine } from '@/hooks/useOrder';
import type { MenuItem, Order } from '@/types/db';

interface OrderContextValue {
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
  cancelOrder: () => Promise<void>;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({
  tableNumber,
  restaurantId,
  children,
}: {
  tableNumber: number | null;
  restaurantId: string | null;
  children: ReactNode;
}) {
  const order = useOrderHook(tableNumber, restaurantId);
  return <OrderContext.Provider value={order}>{children}</OrderContext.Provider>;
}

export function useOrderContext(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrderContext must be used inside <OrderProvider>');
  return ctx;
}
