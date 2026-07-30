import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Loader2, Check, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { MENU_CATEGORIES, type MenuItem } from '@/types/db';
import { cn, formatPrice } from '@/lib/utils';

export function AdminMenu() {
  const { restaurant } = useAdminAuth();
  const restaurantId = restaurant?.id ?? null;
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterCat, setFilterCat] = useState<string>('All');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const loadItems = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, description, price, category, image_url, is_available, restaurant_id, created_at')
      .eq('restaurant_id', restaurantId)
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (!error && data) setItems(data as MenuItem[]);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const filtered = useMemo(() => {
    let list = items;
    if (filterCat !== 'All') list = list.filter((i) => i.category === filterCat);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [items, filterCat, query]);

  const toggleAvailability = async (item: MenuItem) => {
    const newVal = !item.is_available;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: newVal } : i)));
    await supabase.from('menu_items').update({ is_available: newVal }).eq('id', item.id);
  };

  const deleteItem = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await supabase.from('menu_items').delete().eq('id', item.id);
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
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">{items.length} dishes on your menu</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-900 active:scale-[0.98]"
        >
          <Plus size={16} /> Add Dish
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes…"
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-800"
        >
          <option value="All">All categories</option>
          {MENU_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Dish</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Category</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="hidden px-4 py-3 text-center font-medium sm:table-cell">Available</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  No dishes match your search.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-300">
                          <Search size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{item.name}</p>
                        <p className="truncate text-xs text-slate-400">{item.description ?? 'No description'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{item.category}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">${formatPrice(item.price)}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <button
                      onClick={() => toggleAvailability(item)}
                      className={cn(
                        'mx-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                        item.is_available
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      )}
                    >
                      {item.is_available ? <><Eye size={12} /> Visible</> : <><EyeOff size={12} /> Hidden</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(item)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showAdd && restaurantId && (
        <DishModal
          restaurantId={restaurantId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); loadItems(); }}
        />
      )}

      {/* Edit modal */}
      {editing && restaurantId && (
        <DishModal
          restaurantId={restaurantId}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadItems(); }}
        />
      )}
    </div>
  );
}

function DishModal({
  restaurantId,
  existing,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  existing?: MenuItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [category, setCategory] = useState(existing?.category ?? MENU_CATEGORIES[0]);
  const [image_url, setImageUrl] = useState(existing?.image_url ?? '');
  const [isAvailable, setIsAvailable] = useState(existing?.is_available ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (name.trim().length < 1) { setError('Dish name is required'); return; }
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) { setError('Enter a valid price'); return; }
    setBusy(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceNum,
      category,
      image_url: image_url.trim() || null,
      is_available: isAvailable,
      restaurant_id: restaurantId,
    };
    const { error: err } = existing
      ? await supabase.from('menu_items').update(payload).eq('id', existing.id)
      : await supabase.from('menu_items').insert(payload);
    setBusy(false);
    if (err) { setError(err.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {existing ? 'Edit Dish' : 'Add New Dish'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Matcha Cured Salmon"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description for the menu…"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Price ($)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                placeholder="14.00"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-800"
              >
                {MENU_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Image URL</label>
              {image_url && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear image
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <input
                value={image_url}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/…"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
              />
              {image_url ? (
                <img src={image_url} alt="Preview" className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200" />
              ) : null}
            </div>
            <div className="mt-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Sample Pictures</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[
                  { label: 'Sushi', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80' },
                  { label: 'Ramen', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80' },
                  { label: 'Carpaccio', url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80' },
                  { label: 'Grill', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80' },
                  { label: 'Matcha', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80' },
                  { label: 'Cocktail', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <button
              type="button"
              onClick={() => setIsAvailable((v) => !v)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
              )}
            >
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', isAvailable ? 'left-5' : 'left-0.5')} />
            </button>
            Visible to customers
          </label>

          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-900 disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {existing ? 'Save Changes' : 'Add Dish'}
          </button>
        </div>
      </div>
    </div>
  );
}
