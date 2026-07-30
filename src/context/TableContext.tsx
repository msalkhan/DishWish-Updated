import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { RestaurantTable } from '@/types/db';
import { useRestaurant } from '@/context/RestaurantContext';
import { DEFAULT_TABLES } from '@/lib/mockData';

interface TableContextValue {
  tableNumber: number | null;
  table: RestaurantTable | null;
  tables: RestaurantTable[];
  loading: boolean;
  setTableNumber: (n: number | null) => void;
  refreshTables: () => Promise<void>;
}

const TableContext = createContext<TableContextValue | null>(null);
const STORAGE_KEY = 'dishwish.table';

export function useTable(): TableContextValue {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTable must be used inside <TableProvider>');
  return ctx;
}

export function TableProvider({ children }: { children: ReactNode }) {
  const { restaurant } = useRestaurant();
  const restaurantId = restaurant?.id ?? null;

  const [tables, setTables] = useState<RestaurantTable[]>(DEFAULT_TABLES);
  const [tableNumber, setTableNumberState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTables = useCallback(async () => {
    if (!restaurantId) {
      setTables(DEFAULT_TABLES);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('id, table_number, qr_token, capacity, status, restaurant_id')
        .eq('restaurant_id', restaurantId)
        .order('table_number', { ascending: true });
      if (!error && data && data.length > 0) setTables(data as RestaurantTable[]);
      else setTables(DEFAULT_TABLES);
    } catch {
      setTables(DEFAULT_TABLES);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    refreshTables();
  }, [restaurantId, refreshTables]);

  // Clear table selection when restaurant changes
  useEffect(() => {
    setTableNumberState(null);
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
  }, [restaurantId]);

  // Restore table selection from localStorage
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      const n = Number(stored);
      if (!Number.isNaN(n)) setTableNumberState(n);
    }
  }, []);

  const setTableNumber = useCallback((n: number | null) => {
    setTableNumberState(n);
    if (typeof window !== 'undefined') {
      if (n == null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, String(n));
    }
  }, []);

  const table = useMemo(
    () => (tableNumber == null ? null : tables.find((t) => t.table_number === tableNumber) ?? null),
    [tables, tableNumber]
  );

  const value = useMemo<TableContextValue>(
    () => ({ tableNumber, table, tables, loading, setTableNumber, refreshTables }),
    [tableNumber, table, tables, loading, setTableNumber, refreshTables]
  );

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}
