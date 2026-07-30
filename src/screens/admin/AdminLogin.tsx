import { useState } from 'react';
import { Store, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { cn } from '@/lib/utils';

export function AdminLogin() {
  const { signIn, signUp } = useAdminAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'signin') {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    } else {
      if (restaurantName.trim().length < 2) {
        setError('Please enter your restaurant name.');
        setBusy(false);
        return;
      }
      const { error: err } = await signUp(email, password, restaurantName.trim());
      if (err) setError(err);
    }
    setBusy(false);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-white">
            <Store size={26} strokeWidth={2} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Dishwish Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Restaurant management dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          {/* Mode tabs */}
          <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium transition-all',
                mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium transition-all',
                mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Restaurant name</label>
                <input
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="e.g. Sakura Omakase"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="owner@restaurant.com"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition-all focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-900 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? (
                <><Loader2 size={16} className="animate-spin" /> {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            {mode === 'signin'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="font-medium text-slate-700 underline-offset-2 hover:underline"
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Dishwish · Multi-tenant restaurant platform
        </p>
      </div>
    </div>
  );
}
