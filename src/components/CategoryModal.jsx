import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';

export default function CategoryModal({ category, onClose, onSaved }) {
  const { showToast } = useToast();
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || '🍽️');
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const isEdit = !!category;

  async function save() {
    if (!name.trim()) {
      showToast('Category ka naam likhein', 'error');
      return;
    }
    setSaving(true);
    const payload = { name: name.trim(), icon: icon.trim() || '🍽️', sort_order: Number(sortOrder) || 0 };
    const query = isEdit
      ? supabase.from('categories').update(payload).eq('id', category.id).select().single()
      : supabase.from('categories').insert(payload).select().single();
    const { data, error } = await query;
    setSaving(false);
    if (error) {
      showToast(error.message.includes('duplicate') ? 'Ye category naam pehle se maujood hai' : error.message, 'error');
      return;
    }
    showToast(isEdit ? 'Category update ho gayi' : 'Category ban gayi');
    onSaved(data);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl max-w-[340px] w-full shadow-2xl">
        <div className="bg-gradient-to-br from-maroon to-maroon2 p-5 rounded-t-2xl text-center">
          <div className="text-3xl mb-1.5">{icon || '🍽️'}</div>
          <h2 className="text-white text-lg font-black">{isEdit ? 'Edit Category' : 'New Category'}</h2>
        </div>
        <div className="p-5 space-y-3">
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
                placeholder="e.g. Fries"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full mt-1 px-3 py-2 border-2 border-orange-200 rounded-lg outline-none focus:border-orange"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 rounded-lg font-bold text-sm">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-orange text-white rounded-lg font-bold text-sm disabled:bg-gray-300">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
