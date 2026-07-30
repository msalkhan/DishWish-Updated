export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatPrice(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPriceParts(value: number): { dollars: string; cents: string } {
  const fixed = value.toFixed(2);
  const [d, c] = fixed.split('.');
  return { dollars: Number(d).toLocaleString('en-US'), cents: c };
}

/**
 * Generate a short, receipt-style order id e.g. "DWF-24X9K".
 */
export function generateOrderId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  const stamp = Date.now().toString(36).slice(-2).toUpperCase();
  return `DWF-${s}${stamp}`;
}

export function estimatePrepTime(itemCount: number): string {
  const base = 14;
  const minutes = base + Math.min(22, Math.max(0, itemCount - 2) * 2);
  return `${minutes}–${minutes + 6} min`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Convert a restaurant name into a URL-safe slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a random QR token for a table.
 */
export function generateQrToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `qr-${s}`;
}

/**
 * Format a timestamp as a relative "time ago" string.
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * Format a timestamp as HH:MM AM/PM.
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
