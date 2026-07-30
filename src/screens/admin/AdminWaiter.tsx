import { useCallback, useEffect, useState } from 'react';
import { Loader2, BellRing, Check, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import type { WaiterRequest } from '@/types/db';
import { cn, timeAgo, formatTime } from '@/lib/utils';

export function AdminWaiter() {
  const { restaurant } = useAdminAuth();
  const restaurantId = restaurant?.id ?? null;
  const [requests, setRequests] = useState<WaiterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');

  const loadRequests = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    let q = supabase
      .from('waiter_requests')
      .select('id, table_number, restaurant_id, request_type, note, status, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (filter === 'open') q = q.eq('status', 'open');
    else if (filter === 'resolved') q = q.eq('status', 'resolved');
    const { data, error } = await q.limit(50);
    if (!error && data) setRequests(data as WaiterRequest[]);
    setLoading(false);
  }, [restaurantId, filter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel('waiter-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'waiter_requests',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => { loadRequests(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, loadRequests]);

  const resolveRequest = async (req: WaiterRequest) => {
    setResolving(req.id);
    await supabase
      .from('waiter_requests')
      .update({ status: 'resolved' })
      .eq('id', req.id);
    setResolving(null);
    loadRequests();
  };

  const openCount = requests.filter((r) => r.status === 'open').length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary + filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {filter === 'open' && openCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
            <BellRing size={16} className="animate-pulse" />
            {openCount} {openCount === 1 ? 'request' : 'requests'} waiting
          </div>
        )}
        {filter !== 'open' && <div />}
        <div className="flex gap-2">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-medium capitalize transition-all',
                filter === f
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Request list */}
      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-20 text-center">
          <BellRing size={32} className="mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">
            {filter === 'open' ? 'No open requests — all clear.' : 'No requests in this view.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className={cn(
                'flex items-center gap-4 rounded-xl border bg-white p-4 transition-all',
                req.status === 'open'
                  ? 'border-amber-200 shadow-sm'
                  : 'border-slate-200 opacity-70'
              )}
            >
              {/* Icon */}
              <div className={cn(
                'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                req.status === 'open' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
              )}>
                <BellRing size={20} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">Table {req.table_number}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-sm text-slate-500 capitalize">{req.request_type}</span>
                  {req.status === 'open' && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Open
                    </span>
                  )}
                </div>
                {req.note && (
                  <p className="mt-0.5 truncate text-sm text-slate-500">{req.note}</p>
                )}
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={12} />
                  {timeAgo(req.created_at)} · {formatTime(req.created_at)}
                </p>
              </div>

              {/* Action */}
              {req.status === 'open' ? (
                <button
                  onClick={() => resolveRequest(req)}
                  disabled={resolving === req.id}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-900 active:scale-[0.98] disabled:opacity-60"
                >
                  {resolving === req.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <><Check size={15} /> Resolve</>
                  )}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <Check size={15} /> Resolved
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
