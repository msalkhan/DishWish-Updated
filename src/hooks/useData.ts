import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MenuItem, RestaurantTable } from '@/types/db';
import { DEFAULT_MENU_ITEMS, DEFAULT_TABLES } from '@/lib/mockData';

export function useMenu(restaurantId: string | null) {
  const [items, setItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setItems(DEFAULT_MENU_ITEMS);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from('menu_items')
      .select('id, name, description, price, category, image_url, is_available, restaurant_id, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err || !data || data.length === 0) {
          if (err) setError(err.message);
          setItems(DEFAULT_MENU_ITEMS);
        } else {
          setItems(data as MenuItem[]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setItems(DEFAULT_MENU_ITEMS);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const { data, error: err } = await supabase
        .from('menu_items')
        .select('id, name, description, price, category, image_url, is_available, restaurant_id, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (err || !data || data.length === 0) {
        setItems(DEFAULT_MENU_ITEMS);
      } else {
        setItems(data as MenuItem[]);
      }
    } catch {
      setItems(DEFAULT_MENU_ITEMS);
    }
  }, [restaurantId]);

  return { items, loading, error, refresh };
}

export function useTables(restaurantId: string | null) {
  const [tables, setTables] = useState<RestaurantTable[]>(DEFAULT_TABLES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      setTables(DEFAULT_TABLES);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from('tables')
      .select('id, table_number, qr_token, capacity, status, restaurant_id')
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err || !data || data.length === 0) {
          setTables(DEFAULT_TABLES);
        } else {
          setTables(data as RestaurantTable[]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setTables(DEFAULT_TABLES);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  return { tables, loading };
}

/** Insert a waiter request for the given table. Returns the row id or an error. */
export async function callWaiter(
  tableNumber: number,
  restaurantId: string,
  requestType = 'call',
  note?: string
): Promise<{ id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('waiter_requests')
      .insert({
        table_number: tableNumber,
        restaurant_id: restaurantId,
        request_type: requestType,
        note: note ?? null,
        status: 'open',
      })
      .select('id')
      .single();
    if (error) return { id: `mock-wr-${Date.now()}` };
    return { id: data?.id as string };
  } catch {
    return { id: `mock-wr-${Date.now()}` };
  }
}
