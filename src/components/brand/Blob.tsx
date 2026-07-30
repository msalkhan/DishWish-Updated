import { cn } from '@/lib/utils';

/**
 * Organic "torn-paper" blob shape used as section dividers and background accents.
 * Pure SVG so it scales crisply and tints via currentColor / fill classes.
 */
export function Blob({
  className,
  variant = 'a',
}: {
  className?: string;
  variant?: 'a' | 'b' | 'c';
}) {
  const paths: Record<'a' | 'b' | 'c', string> = {
    a: 'M180 40c34 8 60 30 78 58s24 62 14 92-40 52-74 64-72 12-104-2-58-40-64-74 14-70 38-96 78-50 112-42z',
    b: 'M160 30c40-4 78 18 96 52s14 80-8 112-66 50-104 44-72-36-82-74 8-82 36-106 58-26 62-28z',
    c: 'M170 24c36 2 66 24 84 54s22 68 6 100-58 50-96 44-74-32-86-70 8-86 40-108 52-22 52-20z',
  };
  return (
    <svg viewBox="0 0 360 300" className={cn('pointer-events-none', className)} aria-hidden="true">
      <path d={paths[variant]} fill="currentColor" />
    </svg>
  );
}

/**
 * Traditional Japanese ichimatsu (checkerboard) pattern rendered as the table's
 * QR-code stand-in. A distinct pattern is derived from the table number / token
 * so each table renders a recognisably different board.
 */
export function Ichimatsu({
  seed,
  cells = 9,
  className,
  cellClassName,
}: {
  seed: string | number;
  cells?: number;
  className?: string;
  cellClassName?: string;
}) {
  const n = Math.max(5, Math.min(13, cells));
  const numericSeed = String(seed)
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0) * 31, 7);
  const filled = new Set<number>();
  for (let i = 0; i < n * n; i++) {
    // pseudo-random but deterministic per cell index
    const h = Math.abs(Math.sin(numericSeed * 12.9898 + i * 78.233) * 43758.5453);
    if (h % 1 > 0.5) filled.add(i);
  }
  return (
    <div
      className={cn('grid aspect-square w-full select-none rounded-[6px] overflow-hidden', className)}
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
      aria-hidden="true"
    >
      {Array.from({ length: n * n }).map((_, i) => {
        const isBase = i % 2 === 0;
        const isSeed = filled.has(i);
        const opacity = isSeed ? 1 : isBase ? 0.92 : 0;
        if (opacity === 0) return <div key={i} className={cellClassName} />;
        return (
          <div
            key={i}
            className={cn(cellClassName)}
            style={{ opacity, backgroundColor: 'currentColor' }}
          />
        );
      })}
    </div>
  );
}

/**
 * Circular red hanko-style wax-seal stamp used on confirmations / payment success.
 * Slight rotation + double ring + Japanese-style mark for authenticity.
 */
export function Hanko({
  className,
  label = '受理',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        'relative grid place-items-center rounded-full text-hanko',
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="3.5" />
        <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="1.4" />
        {/* square stamp mark, traditional */}
        <rect x="34" y="34" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <rect x="40" y="40" width="40" height="40" fill="currentColor" opacity="0.07" />
      </svg>
      <span
        className="absolute font-display text-[1.05em] font-semibold tracking-tightish"
        style={{ color: 'currentColor' }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Dashed perforation divider — the receipt "tear here" line.
 */
export function Perforation({ className }: { className?: string }) {
  return <hr className={cn('perforation', className)} />;
}

/**
 * Small circular dot used as a refined gold bullet/detail marker.
 */
export function GoldDot({ className }: { className?: string }) {
  return <span className={cn('inline-block h-1.5 w-1.5 rounded-full bg-gold', className)} />;
}
