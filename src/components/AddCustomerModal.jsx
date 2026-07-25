import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';

export default function AddCustomerModal({ initialPhone = '', onClose, onSaved }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !phone.trim()) {
      showToast('Naam aur phone number zaroori hain', 'error');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('customers')
      .insert({ name: name.trim(), phone: phone.trim(), address: address.trim() || null })
      .select()
      .single();
    setSaving(false);
    if (error) {
      showToast(error.message.includes('duplicate') ? 'Ye phone number pehle se maujood hai' : error.message, 'error');
      return;
    }
    showToast('Customer add ho gaya');
    onSaved(data);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl max-w-[360px] w-full shadow-2xl">
        <div className="bg-gradient-to-br from-maroon to-maroon2 p-5 rounded-t-2xl text-center">
          <div className="w-12 h-12 bg-gold rounded-xl text-white text-xl font-black flex items-center justify-center mx-auto mb-2">
            +
          </div>
          <h2 className="text-white text-lg font-black">New Customer</h2>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border-2 border-orange-200 rounded-lg outline-none focus:border-orange"
              placeholder="e.g. Ahmed Khan"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-1 px-3 py-2 border-2 border-orange-200 rounded-lg outline-none focus:border-orange"
              placeholder="0300-1234567"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Address (optional)</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full mt-1 px-3 py-2 border-2 border-orange-200 rounded-lg outline-none focus:border-orange"
              placeholder="House / street, area"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 rounded-lg font-bold text-sm">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-2.5 bg-orange text-white rounded-lg font-bold text-sm disabled:bg-gray-300"
            >
              {saving ? 'Saving…' : 'Save Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
