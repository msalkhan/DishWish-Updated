import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, hasSupabaseCredentials } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import type { Restaurant } from '@/types/db';
import { DEFAULT_RESTAURANT } from '@/lib/mockData';

interface AdminAuthValue {
  session: Session | null;
  user: User | null;
  restaurant: Restaurant | null;
  restaurants: Restaurant[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, restaurantName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshRestaurant: () => Promise<void>;
  setRestaurantSlug: (slug: string) => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([DEFAULT_RESTAURANT]);
  const [loading, setLoading] = useState(true);

  const loadRestaurant = async (uid: string) => {
    try {
      const storedSlug = typeof window !== 'undefined' ? window.localStorage.getItem('dishwish.restaurant-slug') : null;

      const { data: allRests } = await supabase
        .from('restaurants')
        .select('id, name, slug, owner_id, plan, created_at, updated_at')
        .order('name', { ascending: true });

      if (allRests && allRests.length > 0) {
        setRestaurants(allRests as Restaurant[]);
        let match = allRests.find((r) => storedSlug && r.slug === storedSlug);
        if (!match) {
          match = allRests.find((r) => r.owner_id === uid);
        }
        if (!match) {
          match = allRests.find((r) => r.slug === 'dishwish-omakase') || allRests[0];
        }
        setRestaurant(match as Restaurant);
        if (typeof window !== 'undefined' && match.slug) {
          window.localStorage.setItem('dishwish.restaurant-slug', match.slug);
        }
        return;
      }
      setRestaurant(DEFAULT_RESTAURANT);
      setRestaurants([DEFAULT_RESTAURANT]);
    } catch {
      setRestaurant(DEFAULT_RESTAURANT);
      setRestaurants([DEFAULT_RESTAURANT]);
    }
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadRestaurant(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadRestaurant(sess.user.id).finally(() => setLoading(false));
      } else {
        setRestaurant(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Fallback for demo/dev mode if Supabase is not configured
        if (!hasSupabaseCredentials || error.message.includes('FetchError') || error.message.includes('API key')) {
          const mockUser = { id: 'demo-owner-id', email } as User;
          const mockSession = { access_token: 'demo-token', user: mockUser } as Session;
          setUser(mockUser);
          setSession(mockSession);
          setRestaurant(DEFAULT_RESTAURANT);
          return { error: null };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch {
      const mockUser = { id: 'demo-owner-id', email } as User;
      const mockSession = { access_token: 'demo-token', user: mockUser } as Session;
      setUser(mockUser);
      setSession(mockSession);
      setRestaurant(DEFAULT_RESTAURANT);
      return { error: null };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    restaurantName: string
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        if (!hasSupabaseCredentials || error.message.includes('FetchError') || error.message.includes('API key')) {
          const mockUser = { id: 'demo-owner-id', email } as User;
          const mockSession = { access_token: 'demo-token', user: mockUser } as Session;
          const newRest = { ...DEFAULT_RESTAURANT, name: restaurantName, slug: slugify(restaurantName) };
          setUser(mockUser);
          setSession(mockSession);
          setRestaurant(newRest);
          return { error: null };
        }
        return { error: error.message };
      }
      if (!data.user) return { error: 'Sign-up failed — no user returned.' };

      let slug = slugify(restaurantName);
      const { data: existing } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (existing) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }
      const { error: restErr } = await supabase.from('restaurants').insert({
        name: restaurantName,
        slug,
        owner_id: data.user.id,
        plan: 'pro',
      });
      if (restErr) return { error: restErr.message };
      await loadRestaurant(data.user.id);
      return { error: null };
    } catch {
      const mockUser = { id: 'demo-owner-id', email } as User;
      const mockSession = { access_token: 'demo-token', user: mockUser } as Session;
      const newRest = { ...DEFAULT_RESTAURANT, name: restaurantName, slug: slugify(restaurantName) };
      setUser(mockUser);
      setSession(mockSession);
      setRestaurant(newRest);
      return { error: null };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setSession(null);
    setUser(null);
    setRestaurant(null);
  };

  const refreshRestaurant = async () => {
    if (user) await loadRestaurant(user.id);
  };

  const setRestaurantSlug = (slug: string) => {
    const match = restaurants.find((r) => r.slug === slug);
    if (match) {
      setRestaurant(match);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dishwish.restaurant-slug', slug);
      }
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        user,
        restaurant,
        restaurants,
        loading,
        signIn,
        signUp,
        signOut,
        refreshRestaurant,
        setRestaurantSlug,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
