import { useState } from 'react';
import {
  ArrowLeft,
  Wallet,
  Banknote,
  Check,
  Star,
  Mail,
  Loader2,
  Sparkles,
  ShieldCheck,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { useOrderContext } from '@/context/OrderContext';
import { useTable } from '@/context/TableContext';
import { useRestaurant } from '@/context/RestaurantContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Perforation, GoldDot, Hanko, Blob } from '@/components/brand/Blob';
import { cn, formatPrice, sleep } from '@/lib/utils';
import type { Route } from '@/components/layout/BottomNav';

type PayMethod = 'other_wallet' | 'cash';
type Phase = 'select' | 'processing' | 'success' | 'cash_pending';

interface MethodDef {
  key: PayMethod;
  label: string;
  sub: string;
  Icon: typeof Wallet;
  kind: 'wallet' | 'cash';
}

const METHODS: MethodDef[] = [
  { key: 'other_wallet', label: 'Other Wallet', sub: 'Scan & confirm', Icon: Wallet, kind: 'wallet' },
  { key: 'cash', label: 'Pay with Cash', sub: 'Settle with your server', Icon: Banknote, kind: 'cash' },
];

export function Payment({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { activeOrder, lines, loading, subtotal, serviceCharge, tax, total, refresh } = useOrderContext();
  const { tableNumber } = useTable();
  const toast = useToast();
  const [selected, setSelected] = useState<PayMethod | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [tipPercent, setTipPercent] = useState<number>(15);
  const [busy, setBusy] = useState(false);

  const tipAmount = +(subtotal * (tipPercent / 100)).toFixed(2);
  const grandTotal = +(total + tipAmount).toFixed(2);

  const recordPayment = async (method: PayMethod, status: 'pending' | 'paid', stripeId?: string) => {
    if (!activeOrder) return;
    const { error } = await supabase.from('payments').insert({
      order_id: activeOrder.id,
      table_number: activeOrder.table_number,
      payment_method: method,
      tip_amount: tipAmount,
      total_amount: grandTotal,
      payment_status: status,
      stripe_payment_intent_id: stripeId ?? null,
    });
    if (error) throw new Error(error.message);
    const updateFields = status === 'paid'
      ? { payment_status: 'paid', status: 'completed', updated_at: new Date().toISOString() }
      : { payment_status: 'pending', updated_at: new Date().toISOString() };
    const { error: ordErr } = await supabase.from('orders').update(updateFields).eq('id', activeOrder.id);
    if (ordErr) throw new Error(ordErr.message);
  };

  const handlePayNow = async () => {
    if (!selected || !activeOrder) return;
    setBusy(true);
    setPhase('processing');
    try {
      await sleep(1600);
      const stripeId = `sim_${Date.now().toString(36)}`;
      await recordPayment(selected, 'paid', stripeId);
      await refresh();
      setPhase('success');
    } catch (e) {
      setPhase('select');
      toast.push({ title: 'Payment could not complete', body: e instanceof Error ? e.message : 'Please try again.', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleCash = async () => {
    if (!selected || !activeOrder) return;
    setBusy(true);
    try {
      await recordPayment('cash', 'pending');
      await refresh();
      setPhase('cash_pending');
    } catch (e) {
      toast.push({ title: 'Could not record cash payment', body: e instanceof Error ? e.message : 'Please call your server.', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'success') {
    return <SuccessScreen order={activeOrder} tableNumber={tableNumber} onNavigate={onNavigate} onDone={() => setPhase('select')} />;
  }

  if (phase === 'cash_pending') {
    return (
      <div className="route-enter mx-auto max-w-md px-5 pb-32 pt-20">
        <button onClick={() => onNavigate('order')} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-600">
          <ArrowLeft size={15} /> Back to order
        </button>
        <div className="surface relative overflow-hidden p-7 text-center">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 text-cream-200/70">
            <Blob variant="b" className="h-full w-full" />
          </div>
          <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gold-100 text-gold-600">
            <Banknote size={28} strokeWidth={1.8} />
          </div>
          <p className="tracked-label text-[10px] text-gold-600">Cash · pending</p>
          <h1 className="mt-2 font-display text-[24px] font-medium leading-tight text-ink-600">Please pay your server directly</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-400">
            Hand <span className="font-mono font-semibold text-ink-600">${formatPrice(grandTotal)}</span> to your server — they'll confirm once received. Your bill is marked pending until then.
          </p>
          <Perforation className="my-5" />
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-400">Table</span>
            <span className="font-mono font-semibold text-ink-600">{String(tableNumber ?? activeOrder?.table_number ?? '--').padStart(2, '0')}</span>
          </div>
        </div>
        <button onClick={() => onNavigate('home')} className="btn-dark mt-5 w-full">Back to home</button>
      </div>
    );
  }

  if (loading) {
    return <div className="route-enter mx-auto max-w-md px-5 pt-24"><div className="skeleton h-64 w-full rounded-2xl" /></div>;
  }

  if (!activeOrder || lines.length === 0) {
    return (
      <div className="route-enter mx-auto max-w-md px-5 pt-20 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-cream-200 text-gold-500">
          <Wallet size={26} strokeWidth={1.8} />
        </div>
        <h1 className="font-display text-[24px] font-medium text-ink-600">Nothing to pay yet</h1>
        <p className="mt-2 text-[14px] text-ink-300">Once you've placed an order, your bill will appear here.</p>
        <button onClick={() => onNavigate('menu')} className="btn-primary mt-6">Browse the menu</button>
      </div>
    );
  }

  return (
    <div className="route-enter mx-auto max-w-md px-5 pb-32 pt-20">
      <button onClick={() => onNavigate('order')} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-600">
        <ArrowLeft size={15} /> Back to order
      </button>

      {/* ---------- Bill summary ---------- */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="tracked-label text-[10px] text-gold-600">Step 1</p>
          <h1 className="font-display text-[22px] font-medium leading-tight text-ink-600">Review your bill</h1>
        </div>
        <span className="pill bg-forest-100 text-forest-700">
          <Receipt size={12} />
          <span className="font-mono">{activeOrder.order_id}</span>
        </span>
      </div>

      <article className="surface overflow-hidden">
        <div className="px-5 py-4">
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.dish_id} className="flex items-baseline justify-between text-[13.5px]">
                <span className="text-ink-600">
                  <span className="font-mono font-semibold text-coral-500">{l.quantity}×</span> {l.dish_name}
                </span>
                <span className="font-mono tabular-nums text-ink-500">${formatPrice(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>

          <Perforation className="my-4" />

          <dl className="space-y-1.5 text-[13px]">
            <BillRow label="Subtotal" value={`$${formatPrice(subtotal)}`} />
            <BillRow label="Service charge" value={`$${formatPrice(serviceCharge)}`} muted />
            <BillRow label="Tax" value={`$${formatPrice(tax)}`} muted />
            <BillRow label={`Tip (${tipPercent}%)`} value={`$${formatPrice(tipAmount)}`} muted />
          </dl>

          <Perforation className="my-3" />
          <div className="flex items-baseline justify-between">
            <span className="font-display text-[17px] font-medium text-ink-600">Total due</span>
            <span className="font-mono text-[20px] font-semibold tabular-nums text-ink-600">${formatPrice(grandTotal)}</span>
          </div>
        </div>

        {/* Tip selector */}
        <div className="border-t border-gold-300/20 bg-cream-100/40 px-5 py-4">
          <p className="tracked-label mb-2.5 text-[10px] text-gold-600">Add a tip</p>
          <div className="flex gap-2">
            {[10, 15, 20, 25].map((p) => (
              <button
                key={p}
                onClick={() => setTipPercent(p)}
                className={cn(
                  'flex-1 rounded-xl border py-2.5 font-mono text-[13px] font-semibold transition-all duration-300',
                  tipPercent === p ? 'border-coral-300 bg-coral-300 text-forest-800 shadow-soft' : 'border-gold-300/35 bg-cream-50 text-ink-400 hover:border-gold-300'
                )}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>
      </article>

      {/* ---------- Payment method ---------- */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GoldDot />
            <h2 className="tracked-label text-[10px] text-gold-600">Step 2 · Choose payment</h2>
          </div>
          <span className="flex items-center gap-1 text-[10.5px] text-ink-300">
            <ShieldCheck size={12} className="text-forest-500" /> Secured
          </span>
        </div>

        <div className="space-y-2.5">
          {METHODS.map((m) => {
            const active = selected === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setSelected(m.key)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border bg-cream-50 px-4 py-3.5 text-left transition-all duration-300 ease-gentle',
                  active ? 'border-coral-300 shadow-coralline' : 'border-gold-300/30 hover:border-gold-300 hover:shadow-soft'
                )}
              >
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors', active ? 'bg-coral-300 text-forest-800' : 'bg-cream-200 text-ink-500')}>
                  <m.Icon size={18} strokeWidth={2.1} />
                </span>
                <span className="flex-1">
                  <span className="block font-display text-[15px] font-medium text-ink-600">{m.label}</span>
                  <span className="block text-[12px] text-ink-300">{m.sub}</span>
                </span>
                <span className={cn('grid h-5 w-5 place-items-center rounded-full border transition-all', active ? 'border-coral-400 bg-coral-400 text-cream-50' : 'border-gold-300/50 text-transparent')}>
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Cash message */}
        {selected === 'cash' && (
          <div className="mt-4 rounded-2xl border border-gold-300/30 bg-cream-100/70 p-4 text-[13px] leading-relaxed text-ink-500 animate-fadeIn">
            Please pay your server directly — they'll confirm once received. A pending payment will be recorded for <span className="font-mono font-semibold text-ink-600">Table {tableNumber}</span>.
          </div>
        )}

        {/* Pay CTA */}
        <button
          onClick={selected === 'cash' ? handleCash : handlePayNow}
          disabled={!selected || busy}
          className={cn(
            'mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display text-[16px] font-medium shadow-soft transition-all duration-300 ease-gentle',
            selected ? 'bg-coral-300 text-forest-800 hover:bg-coral-400 hover:shadow-lifted' : 'bg-cream-200 text-ink-200',
            busy && 'opacity-80'
          )}
        >
          {busy ? (
            <><Loader2 size={18} className="animate-spin" /> Processing…</>
          ) : selected === 'cash' ? (
            <>Record cash payment</>
          ) : (
            <>Pay ${formatPrice(grandTotal)} now <ArrowRight size={16} /></>
          )}
        </button>
      </div>

      {/* Processing overlay */}
      {phase === 'processing' && (
        <div className="fixed inset-0 z-[55] grid place-items-center bg-forest-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="surface px-8 py-7 text-center">
            <Loader2 size={28} className="mx-auto animate-spin text-coral-400" />
            <p className="mt-3 font-display text-[16px] text-ink-600">Confirming with {selected?.replace('_', ' ')}…</p>
            <p className="mt-1 text-[12px] text-ink-300">Please don't close this window</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BillRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={muted ? 'text-ink-300' : 'text-ink-500'}>{label}</dt>
      <dd className="font-mono tabular-nums text-ink-500">{value}</dd>
    </div>
  );
}

function SuccessScreen({
  order,
  tableNumber,
  onNavigate,
  onDone,
}: {
  order: { order_id: string } | null;
  tableNumber: number | null;
  onNavigate: (r: Route) => void;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [email, setEmail] = useState('');
  const [compliments, setCompliments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { restaurant } = useRestaurant();

  const submitFeedback = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('customer_feedback').insert({
        order_id: null,
        table_number: tableNumber,
        restaurant_id: restaurant?.id ?? null,
        rating,
        compliments: compliments || null,
        guest_email: email || null,
      });
      if (error) throw new Error(error.message);
      setSubmitted(true);
      toast.push({ title: 'Thank you for your feedback', variant: 'success' });
    } catch (e) {
      toast.push({ title: 'Could not save feedback', body: e instanceof Error ? e.message : 'Please try again.', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="route-enter relative min-h-screen overflow-hidden bg-cream-100 px-5 pb-32 pt-20">
      <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 text-cream-200/70">
        <Blob variant="a" className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute -left-24 bottom-20 h-80 w-80 text-cream-200/60">
        <Blob variant="c" className="h-full w-full" />
      </div>

      <div className="relative mx-auto max-w-md">
        <div className="flex justify-center">
          <Hanko label="御礼" className="h-28 w-28 animate-sealIn text-hanko" />
        </div>

        <div className="mt-6 text-center">
          <p className="tracked-label text-[11px] text-gold-600">Payment complete</p>
          <h1 className="mt-2 font-display text-[32px] font-medium leading-tight text-ink-600">
            Thank you, <br />
            <span className="text-coral-400">Table {tableNumber ?? '—'}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-[14px] leading-relaxed text-ink-400">
            It was a pleasure serving you tonight. Your receipt has been recorded — we hope to welcome you back soon.
          </p>
        </div>

        {/* Receipt card */}
        <div className="surface mt-7 p-5">
          <div className="flex items-center justify-between">
            <span className="tracked-label text-[10px] text-gold-600">Receipt</span>
            <span className="font-mono text-[12px] text-ink-400">{order?.order_id ?? '—'}</span>
          </div>
          <Perforation className="my-3" />
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-400">Table</span>
            <span className="font-mono font-semibold text-ink-600">{String(tableNumber ?? '--').padStart(2, '0')}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px]">
            <span className="text-ink-400">Status</span>
            <span className="pill bg-forest-100 text-forest-700">
              <Check size={12} strokeWidth={3} /> Paid
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => toast.push({ title: 'Receipt link sent', body: email ? `To ${email}` : 'Check your inbox', variant: 'success' })}
              className="btn-secondary py-2.5 text-[13px]"
            >
              <Mail size={15} /> Email receipt
            </button>
            <button
              onClick={() => onNavigate('order')}
              className="btn-secondary py-2.5 text-[13px]"
            >
              <Receipt size={15} /> View order
            </button>
          </div>
        </div>

        {/* Feedback */}
        <div className="surface mt-6 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={15} className="text-gold-500" />
            <h2 className="font-display text-[17px] font-medium text-ink-600">Rate your experience</h2>
          </div>

          {submitted ? (
            <div className="rounded-2xl bg-forest-100 px-4 py-4 text-center text-[14px] text-forest-700">
              <Check className="mx-auto mb-2 text-forest-600" size={22} />
              Thanks for sharing — your kind words mean a lot to the kitchen.
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="transition-transform duration-200 ease-gentle hover:scale-110"
                    aria-label={`${n} stars`}
                  >
                    <Star size={28} className={cn('transition-colors', (hover || rating) >= n ? 'fill-coral-300 text-coral-300' : 'text-cream-300')} />
                  </button>
                ))}
              </div>
              <textarea
                value={compliments}
                onChange={(e) => setCompliments(e.target.value)}
                placeholder="Compliments for the kitchen or your server…"
                rows={2}
                className="field mt-4 resize-none"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email (optional, for receipt & offers)"
                className="field mt-2.5"
              />
              <button
                onClick={submitFeedback}
                disabled={submitting || rating === 0}
                className={cn(
                  'mt-4 w-full rounded-2xl py-3 font-display text-[14px] font-medium transition-all duration-300',
                  rating > 0 && !submitting ? 'bg-coral-300 text-forest-800 shadow-soft hover:bg-coral-400 hover:shadow-lifted' : 'bg-cream-200 text-ink-200'
                )}
              >
                {submitting ? 'Sending…' : 'Submit feedback'}
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => { onDone(); onNavigate('home'); }}
          className="btn-dark mt-5 w-full"
        >
          Finish & return home
        </button>
      </div>
    </div>
  );
}
