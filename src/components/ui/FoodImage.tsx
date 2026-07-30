import { useState } from 'react';
import { cn } from '@/lib/utils';
import { UtensilsCrossed } from 'lucide-react';

/**
 * Moody food tile. If image_url is missing or fails to load, falls back to an
 * elegant dark gradient tile with a subtle chopsticks glyph so no broken image
 * ever reaches the screen.
 */
export function FoodImage({
  src,
  alt,
  className,
  rounded = 'rounded-2xl',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;

  return (
    <div className={cn('relative overflow-hidden', rounded, 'food-moody', className)}>
      {showImg ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover transition-transform duration-700 ease-gentle')}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <UtensilsCrossed className="text-gold-400/40" size={28} strokeWidth={1.5} />
        </div>
      )}
      {/* warm vignette + plate glow regardless of image presence */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-950/70 via-forest-900/10 to-transparent" />
      <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-coral-300/15 blur-2xl" />
    </div>
  );
}
