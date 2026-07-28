import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';

const DEFAULTS = {
  shop_name: 'Khurd o Nosh',
  tagline: 'Khao, Piyo, Khush Raho',
  phone: '',
  address: '',
  receipt_footer: 'Shukriya! Dobara tashreef laayein.',
  tax_percent: 0,
  currency_symbol: 'Rs',
};

export default function ShopSettingsPanel() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
      if (!error && data) setSettings(data);
      setLoading(false);
    })();
  }, []);

  function update(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('shop_settings')
      .upsert({ ...settings, id: 1, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) showToast(error.message, 'error');
    else showToast('Shop settings save ho gayi');
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  return (
    <div className="bg-white rounded-[13px] p-5 border-2 border-gray-100 max-w-[560px]">
      <h3 className="text-base font-black mb-4 flex items-center gap-1.5">🏪 Shop Settings</h3>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase">Shop Name</label>
          <input
            value={settings.shop_name || ''}
            onChange={(e) => update('shop_name', e.target.value)}
            className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase">Tagline (shown on customer slip)</label>
          <input
            value={settings.tagline || ''}
            onChange={(e) => update('tagline', e.target.value)}
            className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Phone</label>
            <input
              value={settings.phone || ''}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
              placeholder="042-1234567"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Currency Symbol</label>
            <input
              value={settings.currency_symbol || ''}
              onChange={(e) => update('currency_symbol', e.target.value)}
              className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase">Shop Address</label>
          <input
            value={settings.address || ''}
            onChange={(e) => update('address', e.target.value)}
            className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase">Tax %</label>
          <input
            type="number"
            step="0.01"
            value={settings.tax_percent ?? 0}
            onChange={(e) => update('tax_percent', Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase">Receipt Footer Note</label>
          <input
            value={settings.receipt_footer || ''}
            onChange={(e) => update('receipt_footer', e.target.value)}
            className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full mt-2 py-3 bg-orange text-white rounded-lg font-black text-sm disabled:bg-gray-300"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
