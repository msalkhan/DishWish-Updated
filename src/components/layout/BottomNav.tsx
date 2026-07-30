import { Home, UtensilsCrossed, ReceiptText, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Route = 'home' | 'menu' | 'order' | 'pay';

const NAV_ITEMS: { key: Route; label: string; Icon: typeof Home }[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'menu', label: 'Menu', Icon: UtensilsCrossed },
  { key: 'order', label: 'Order', Icon: ReceiptText },
  { key: 'pay', label: 'Pay', Icon: Wallet },
];

export function BottomNav({
  route,
  onNavigate,
  orderBadge,
  payBadge,
}: {
  route: Route;
  onNavigate: (r: Route) => void;
  orderBadge?: number;
  payBadge?: boolean;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gold-300/30 bg-cream-50/95 pb-safe backdrop-blur-xl"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = route === key;
          const badge = key === 'order' && orderBadge ? orderBadge : null;
          const payActive = key === 'pay' && payBadge;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className="group relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'absolute top-1.5 h-8 w-12 rounded-full transition-all duration-300 ease-gentle',
                  active ? 'bg-forest-700/8 opacity-100' : 'opacity-0'
                )}
              />
              <span
                className={cn(
                  'relative grid h-8 w-8 place-items-center rounded-full transition-all duration-300 ease-gentle',
                  active
                    ? 'bg-forest-700 text-cream-50 shadow-soft scale-105'
                    : 'text-ink-300 group-hover:text-ink-500 group-hover:scale-105'
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.4 : 2} />
                {badge ? (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral-400 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-cream-50">
                    {badge}
                  </span>
                ) : null}
                {payActive && !active ? (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-coral-400 ring-2 ring-cream-50" />
                ) : null}
              </span>
              <span
                className={cn(
                  'relative text-[10px] font-medium tracking-wideish transition-colors',
                  active ? 'text-forest-700' : 'text-ink-300 group-hover:text-ink-500'
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
