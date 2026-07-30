import { ShoppingBag, ArrowRight } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';

export function CartBar({
  itemCount,
  total,
  onClick,
  disabled,
}: {
  itemCount: number;
  total: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (itemCount <= 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[68px] z-40 px-4 pb-safe">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'pointer-events-auto mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-forest-700 px-4 py-3 text-cream-50 shadow-deep ring-1 ring-cream-100/10 transition-all duration-300 ease-gentle',
          'hover:-translate-y-0.5 active:translate-y-0',
          disabled && 'opacity-60'
        )}
      >
        <span className="relative grid h-9 w-9 place-items-center rounded-full bg-coral-300 text-forest-800">
          <ShoppingBag size={16} strokeWidth={2.4} />
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white ring-2 ring-forest-700">
            {itemCount}
          </span>
        </span>
        <span className="flex flex-1 flex-col items-start">
          <span className="font-display text-[15px] font-medium leading-tight">Review your order</span>
          <span className="text-[11px] text-cream-200/70">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[16px] font-semibold tabular-nums">${formatPrice(total)}</span>
          <ArrowRight size={16} className="text-cream-200/60" />
        </span>
      </button>
    </div>
  );
}
