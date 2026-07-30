import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Loader2, Trash2, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import type { RestaurantTable } from '@/types/db';
import { generateQrToken, cn } from '@/lib/utils';

export function AdminTables() {
  const { restaurant } = useAdminAuth();
  const restaurantId = restaurant?.id ?? null;
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadTables = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tables')
      .select('id, table_number, qr_token, capacity, status, restaurant_id')
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true });
    if (!error && data) setTables(data as RestaurantTable[]);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const regenerateQr = async (table: RestaurantTable) => {
    if (!confirm(`Regenerate QR token for Table ${table.table_number}? The old token will stop working.`)) return;
    setBusy(true);
    const newToken = generateQrToken();
    const { error } = await supabase
      .from('tables')
      .update({ qr_token: newToken })
      .eq('id', table.id);
    setBusy(false);
    if (error) {
      alert(`Failed: ${error.message}`);
    } else {
      setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, qr_token: newToken } : t)));
    }
  };

  const deleteTable = async (table: RestaurantTable) => {
    if (!confirm(`Delete Table ${table.table_number}? This cannot be undone.`)) return;
    setTables((prev) => prev.filter((t) => t.id !== table.id));
    await supabase.from('tables').delete().eq('id', table.id);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">{tables.length} tables configured</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-900 active:scale-[0.98]"
        >
          <Plus size={16} /> Add Table
        </button>
      </div>

      {/* Table cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Table</p>
                <p className="text-2xl font-bold text-slate-900">{table.table_number}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  table.status === 'occupied'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
                )}
              >
                {table.status === 'occupied' ? 'Occupied' : 'Available'}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Users size={14} /> {table.capacity} seats
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-400">QR Token</p>
              <p className="truncate font-mono text-xs text-slate-600">{table.qr_token}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => regenerateQr(table)}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={13} /> Regenerate QR
              </button>
              <button
                onClick={() => deleteTable(table)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete table"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && restaurantId && (
        <AddTableModal
          restaurantId={restaurantId}
          existingNumbers={tables.map((t) => t.table_number)}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); loadTables(); }}
        />
      )}
    </div>
  );
}

function AddTableModal({
  restaurantId,
  existingNumbers,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  existingNumbers: number[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const [tableNumber, setTableNumber] = useState(String(nextNumber));
  const [capacity, setCapacity] = useState('4');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const num = parseInt(tableNumber, 10);
    const cap = parseInt(capacity, 10);
    if (Number.isNaN(num) || num < 1) { setError('Enter a valid table number'); return; }
    if (existingNumbers.includes(num)) { setError(`Table ${num} already exists`); return; }
    setBusy(true);
    const { error: err } = await supabase.from('tables').insert({
      table_number: num,
      capacity: Number.isNaN(cap) ? 4 : cap,
      qr_token: generateQrToken(),
      status: 'available',
      restaurant_id: restaurantId,
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add New Table</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Table Number</label>
            <input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              type="number"
              min="1"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Capacity (seats)</label>
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              type="number"
              min="1"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
            />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add Table
          </button>
        </div>
      </div>
    </div>
  );
}
