import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/types/db';
import { DEFAULT_RESTAURANT } from '@/lib/mockData';

interface RestaurantContextValue {
  restaurant: Restaurant | null;
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  setRestaurantSlug: (slug: string | null) => void;
  refresh: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);
const SLUG_KEY = 'dishwish.restaurant-slug';

export function useRestaurant(): RestaurantContextValue {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used inside <RestaurantProvider>');
  return ctx;
}

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([DEFAULT_RESTAURANT]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(DEFAULT_RESTAURANT);
  const [slug, setSlugState] = useState<string | null>(DEFAULT_RESTAURANT.slug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all restaurants once on mount (for the picker)
  useEffect(() => {
    let active = true;
    supabase
      .from('restaurants')
      .select('id, name, slug, owner_id, plan, created_at, updated_at')
      .order('name', { ascending: true })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err || !data || data.length === 0) {
          setRestaurants([DEFAULT_RESTAURANT]);
        } else {
          setRestaurants(data as Restaurant[]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setRestaurants([DEFAULT_RESTAURANT]);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  // Restore slug from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(SLUG_KEY) : null;
    if (stored) setSlugState(stored);
    else if (restaurants.length > 0) {
      const defaultSlug = restaurants[0].slug;
      setSlugState(defaultSlug);
      if (typeof window !== 'undefined') window.localStorage.setItem(SLUG_KEY, defaultSlug);
    }
  }, [restaurants]);

  // Fetch the restaurant matching the slug
  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    supabase
      .from('restaurants')
      .select('id, name, slug, owner_id, plan, created_at, updated_at')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err || !data) {
          if (slug === DEFAULT_RESTAURANT.slug) {
            setRestaurant(DEFAULT_RESTAURANT);
          } else {
            setError(err?.message ?? null);
          }
        } else {
          setRestaurant(data as Restaurant);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          if (slug === DEFAULT_RESTAURANT.slug) setRestaurant(DEFAULT_RESTAURANT);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [slug]);

  const setRestaurantSlug = useCallback((newSlug: string | null) => {
    setSlugState(newSlug);
    if (typeof window !== 'undefined') {
      if (newSlug) window.localStorage.setItem(SLUG_KEY, newSlug);
      else window.localStorage.removeItem(SLUG_KEY);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!slug) return;
    const { data, error: err } = await supabase
      .from('restaurants')
      .select('id, name, slug, owner_id, plan, created_at, updated_at')
      .eq('slug', slug)
      .maybeSingle();
    if (err) setError(err.message);
    else setRestaurant((data as Restaurant) ?? null);
  }, [slug]);

  const value = useMemo<RestaurantContextValue>(
    () => ({ restaurant, restaurants, loading, error, setRestaurantSlug, refresh }),
    [restaurant, restaurants, loading, error, setRestaurantSlug, refresh]
  );

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}
