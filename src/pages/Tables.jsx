import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { fmtPKR, timeAgo } from '../lib/format';

const STATUS_META = {
  free: { label: 'Free', cardCls: 'bg-white border-green-200', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  occupied: { label: 'Occupied', cardCls: 'bg-red-50 border-red-300', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  reserved: { label: 'Reserved', cardCls: 'bg-yellow-50 border-yellow-300', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  cleaning: { label: 'Cleaning', cardCls: 'bg-gray-100 border-gray-300', dot: 'bg-gray-400', badge: 'bg-gray-200 text-gray-600' },
};

export default function Tables() {
  const { showToast } = useToast();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // table being viewed in the detail panel

  async function load() {
    const { data } = await supabase.from('dining_tables').select('*').order('name');
    setTables(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel('tables-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_tables' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function setStatus(table, status) {
    const { error } = await supabase.from('dining_tables').update({ status }).eq('id', table.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`${table.name} → ${STATUS_META[status].label}`);
    setSelected(null);
  }

  async function openTable(table) {
    if (table.status !== 'occupied') {
      setSelected({ table, orders: [] });
      return;
    }
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('table_id', table.id)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });
    setSelected({ table, orders: data || [] });
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading tables…</div>;

  return (
    <div className="max-w-[1100px] mx-auto p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[22px] font-black text-maroon flex items-center gap-2">🪑 Tables</h2>
        <div className="ml-auto flex gap-3 text-xs font-bold text-gray-500">
          {Object.entries(STATUS_META).map(([k, m]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} /> {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
        {tables.map((t) => {
          const meta = STATUS_META[t.status];
          return (
            <button
              key={t.id}
              onClick={() => openTable(t)}
              className={`rounded-2xl p-5 border-2 text-center shadow-sm hover:shadow-lg transition-all ${meta.cardCls}`}
            >
              <div className="text-4xl mb-2">🪑</div>
              <div className="text-lg font-black text-maroon">{t.name}</div>
              <div className="text-[11px] text-gray-400 font-semibold mb-2">{t.capacity} seats</div>
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${meta.badge}`}>{meta.label}</span>
            </button>
          );
        })}
        {!tables.length && (
          <div className="col-span-full text-center text-gray-400 py-10">
            Koi table configure nahi hui — Admin → Menu &amp; Areas mein jaake tables add karein
          </div>
        )}
      </div>

      {/* DETAIL / ACTION PANEL */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-[400px] w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="bg-maroon p-4 rounded-t-2xl text-center">
              <div className="text-3xl mb-1">🪑</div>
              <h2 className="text-white text-lg font-black">{selected.table.name}</h2>
              <p className="text-yellow-300 text-xs">{selected.table.capacity} seats</p>
            </div>

            <div className="p-4">
              {selected.table.status === 'occupied' && (
                <>
                  <h3 className="text-sm font-extrabold mb-2">Active Orders</h3>
                  {selected.orders.length ? (
                    selected.orders.map((o) => (
                      <div key={o.id} className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-100">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-black text-sm">{o.order_number}</span>
                          <span className="text-xs text-gray-400">{timeAgo(o.created_at)}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-1.5">
                          {(o.order_items || []).map((it) => `${it.quantity}× ${it.item_name}`).join(', ')}
                        </div>
                        <div className="text-sm font-extrabold text-orange">{fmtPKR(o.total)}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 mb-2">Koi active order nahi mila is table ke liye.</p>
                  )}
                </>
              )}

              <h3 className="text-sm font-extrabold mb-2 mt-3">Set Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_META).map(([k, m]) => (
                  <button
                    key={k}
                    onClick={() => setStatus(selected.table, k)}
                    disabled={selected.table.status === k}
                    className={`py-2.5 rounded-lg text-xs font-bold ${
                      selected.table.status === k ? 'bg-gray-100 text-gray-300' : `${m.badge} hover:opacity-80`
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSelected(null)}
                className="w-full mt-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
