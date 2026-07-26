import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';

export default function MenuItemModal({ item, categories, defaultCategoryId, onClose, onSaved }) {
  const { showToast } = useToast();
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [icon, setIcon] = useState(item?.icon || '🍽️');
  const [price, setPrice] = useState(item?.price ?? '');
  const [categoryId, setCategoryId] = useState(item?.category_id || defaultCategoryId || categories[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const isEdit = !!item;

  async function save() {
    if (!name.trim() || !price || !categoryId) {
      showToast('Naam, price aur category select karein', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      icon: icon.trim() || '🍽️',
      price: Number(price),
      category_id: Number(categoryId),
    };
    const query = isEdit
      ? supabase.from('menu_items').update(payload).eq('id', item.id).select().single()
      : supabase.from('menu_items').insert(payload).select().single();
    const { data, error } = await query;
    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(isEdit ? 'Menu item update ho gaya' : 'Menu item add ho gaya');
    onSaved(data);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl max-w-[380px] w-full shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-maroon to-maroon2 p-5 rounded-t-2xl text-center">
          <div className="text-3xl mb-1.5">{icon || '🍽️'}</div>
          <h2 className="text-white text-lg font-black">{isEdit ? 'Edit Menu Item' : 'New Menu Item'}</h2>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Which category is this item?</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border-2 border-orange-200 rounded-lg outline-none focus:border-orange bg-white"
              autoFocus
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="w-20 flex-shrink-0">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Icon</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full mt-1 px-2 py-2 border-2 border-orange-200 rounded-lg text-center text-xl outline-none focus:border-orange"
                placeholder="🍟"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border-2 border-orange-200 rounded-lg outline-none focus:border-orange"
                placeholder="e.g. Cheese Loaded Fries"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 px-3 py-2 border-2 border-orange-200 rounded-lg outline-none focus:border-orange"
              placeholder="e.g. Small / Medium / with sauce…"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Price (Rs)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full mt-1 px-3 py-2 border-2 border-orange-200 rounded-lg outline-none focus:border-orange"
              placeholder="e.g. 499"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 rounded-lg font-bold text-sm">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-orange text-white rounded-lg font-bold text-sm disabled:bg-gray-300">
              {saving ? 'Saving…' : 'Save Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
