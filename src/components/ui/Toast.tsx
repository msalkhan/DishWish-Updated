import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Check, BellRing, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'notice' | 'error';

interface Toast {
  id: number;
  title: string;
  body?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (t: { title: string; body?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<ToastContextValue['push']>((t) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title: t.title, body: t.body, variant: t.variant ?? 'success' }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3800);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-8">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 3400);
    return () => clearTimeout(t);
  }, []);

  const Icon = toast.variant === 'notice' ? BellRing : Check;
  const accent =
    toast.variant === 'error'
      ? 'text-coral-600 border-coral-300/60'
      : toast.variant === 'notice'
      ? 'text-gold-600 border-gold-300/60'
      : 'text-forest-600 border-gold-300/50';

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm animate-toastIn rounded-2xl border bg-cream-50/95 px-4 py-3.5 shadow-lifted backdrop-blur-sm transition-all duration-300',
        accent,
        leaving && 'translate-y-3 opacity-0'
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
            toast.variant === 'error'
              ? 'bg-coral-100 text-coral-600'
              : toast.variant === 'notice'
              ? 'bg-gold-100 text-gold-600'
              : 'bg-forest-100 text-forest-700'
          )}
        >
          <Icon size={15} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-medium leading-tight text-ink-600">{toast.title}</p>
          {toast.body && <p className="mt-0.5 text-[13px] leading-snug text-ink-400">{toast.body}</p>}
        </div>
        <button
          onClick={onDismiss}
          className="ml-1 shrink-0 rounded-full p-1 text-ink-200 transition-colors hover:text-ink-500"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
