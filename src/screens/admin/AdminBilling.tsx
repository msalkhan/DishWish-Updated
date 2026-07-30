import { Check, CreditCard, Zap, Settings } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';

export function AdminBilling() {
  const { restaurant } = useAdminAuth();

  const features = [
    'Unlimited tables & QR codes',
    'Full menu management',
    'Live order tracking',
    'Real-time waiter requests',
    'Analytics dashboard',
    'Priority support',
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Current plan card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-8 text-white">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <span className="text-sm font-medium uppercase tracking-wide text-slate-300">Current Plan</span>
          </div>
          <h2 className="mt-2 text-3xl font-bold">Pro Plan</h2>
          <p className="mt-1 text-sm text-slate-300">
            {restaurant?.name ?? 'Your restaurant'} · Active
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-900">$49<span className="text-base font-normal text-slate-400">/mo</span></p>
              <p className="mt-1 text-sm text-slate-500">Billed monthly · Next renewal on the 1st</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
            </span>
          </div>
        </div>
      </div>

      {/* Features list */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Included in your plan</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <Check size={13} strokeWidth={3} />
              </span>
              <span className="text-sm text-slate-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Billing actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Billing Management</h3>
        <p className="mb-4 text-sm text-slate-500">
          Manage your payment method, download invoices, and update your billing details.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => alert('Billing management is not yet available. This is a placeholder for the upcoming Stripe integration.')}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-900 active:scale-[0.98]"
          >
            <CreditCard size={16} /> Manage Billing
          </button>
          <button
            onClick={() => alert('Plan management is not yet available. This is a placeholder for the upcoming Stripe integration.')}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Settings size={16} /> Change Plan
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Billing integration coming soon. Your plan is currently active at no charge.
        </p>
      </div>
    </div>
  );
}
