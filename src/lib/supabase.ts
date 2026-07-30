import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Dishwish is missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: { persistSession: true },
  }
);

export const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey);
